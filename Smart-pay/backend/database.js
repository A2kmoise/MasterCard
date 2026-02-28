const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// MongoDB Atlas connection (update with your connection string)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abayomoise950_db_user:1k5N4f5F2p3ceZgW@cards.ppseziu.mongodb.net/smartpay?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true";
const DB_NAME = "smartpay";

let client = null;
let db = null;

// Initialize MongoDB connection
async function connectDB() {
    try {
        client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 5
        });

        await client.connect();
        db = client.db(DB_NAME);

        console.log(" Connected to MongoDB Atlas");

        // Initialize collections with indexes
        await initializeCollections();

        return db;
    } catch (error) {
        console.error("✗ MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

// Initialize collections and create indexes
async function initializeCollections() {
    try {
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        // Create collections if they don't exist
        if (!collectionNames.includes('cards')) {
            await db.createCollection('cards');
            await db.collection('cards').createIndex({ uid: 1 }, { unique: true });
            console.log("✓ Created 'cards' collection");
        }

        if (!collectionNames.includes('wallets')) {
            await db.createCollection('wallets');
            await db.collection('wallets').createIndex({ cardUid: 1 }, { unique: true });
            console.log("✓ Created 'wallets' collection");
        }

        if (!collectionNames.includes('products')) {
            await db.createCollection('products');
            console.log("✓ Created 'products' collection");
        }

        if (!collectionNames.includes('transactions')) {
            await db.createCollection('transactions');
            await db.collection('transactions').createIndex({ cardUid: 1 });
            await db.collection('transactions').createIndex({ createdAt: 1 });
            console.log("✓ Created 'transactions' collection");
        }

    } catch (error) {
        console.error("Collection initialization error:", error.message);
    }
}

// Get database instance
function getDB() {
    if (!db) {
        throw new Error("Database not connected. Call connectDB() first");
    }
    return db;
}

// Get MongoDB client
function getClient() {
    if (!client) {
        throw new Error("MongoDB client not initialized");
    }
    return client;
}

// Safe wallet update with atomic transaction
async function updateWalletAtomic(cardUid, amount, transactionType, reason = null) {
    const session = client.startSession();

    try {
        const result = await session.withTransaction(async () => {
            const walletCollection = db.collection('wallets');
            const transactionCollection = db.collection('transactions');

            // 1. Get current wallet
            const wallet = await walletCollection.findOne({ cardUid });

            if (!wallet) {
                throw new Error(`Wallet not found for card ${cardUid}`);
            }

            const previousBalance = wallet.balance;
            const newBalance = previousBalance + amount;

            // Prevent negative balance on payment
            if (transactionType === 'PAYMENT' && newBalance < 0) {
                throw new Error('Insufficient balance');
            }

            // 2. Update wallet
            await walletCollection.updateOne(
                { cardUid },
                {
                    $set: {
                        balance: newBalance,
                        updatedAt: new Date()
                    }
                },
                { session }
            );

            // 3. Record transaction
            const transaction = {
                cardUid,
                type: transactionType,
                amount: Math.abs(amount),
                previousBalance,
                newBalance,
                status: 'SUCCESS',
                reason,
                createdAt: new Date()
            };

            const txResult = await transactionCollection.insertOne(transaction, { session });

            return {
                success: true,
                cardUid,
                previousBalance,
                newBalance,
                transactionId: txResult.insertedId,
                timestamp: new Date()
            };
        });

        return result;
    } catch (error) {
        // Transaction automatically aborted on error
        return {
            success: false,
            error: error.message,
            cardUid
        };
    } finally {
        await session.endSession();
    }
}

// Get or create wallet for a card
async function getOrCreateWallet(cardUid) {
    try {
        const walletCollection = db.collection('wallets');
        const cardsCollection = db.collection('cards');

        // Check if card exists
        let card = await cardsCollection.findOne({ uid: cardUid });
        if (!card) {
            // Create new card
            await cardsCollection.insertOne({
                uid: cardUid,
                owner: null,
                createdAt: new Date()
            });
        }

        // Get or create wallet
        let wallet = await walletCollection.findOne({ cardUid });
        if (!wallet) {
            const result = await walletCollection.insertOne({
                cardUid,
                balance: 0,
                updatedAt: new Date()
            });
            wallet = {
                _id: result.insertedId,
                cardUid,
                balance: 0,
                updatedAt: new Date()
            };
        }

        return wallet;
    } catch (error) {
        throw new Error(`Failed to get/create wallet: ${error.message}`);
    }
}

// Get wallet balance
async function getWalletBalance(cardUid) {
    try {
        const wallet = await db.collection('wallets').findOne({ cardUid });
        return wallet ? wallet.balance : null;
    } catch (error) {
        throw new Error(`Failed to fetch balance: ${error.message}`);
    }
}

// Get transaction history
async function getTransactionHistory(cardUid, limit = 10) {
    try {
        const transactions = await db.collection('transactions')
            .find({ cardUid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
        return transactions;
    } catch (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
}

// Get all products
async function getProducts() {
    try {
        const products = await db.collection('products')
            .find({ active: true })
            .toArray();
        return products;
    } catch (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

// Seed default products (Transport & Buy)
async function seedProducts() {
    try {
        const productsCollection = db.collection('products');
        const count = await productsCollection.countDocuments();

        if (count === 0) {
            const defaultProducts = [
                {
                    name: "Transport",
                    price: 200,
                    active: true,
                    createdAt: new Date()
                },
                {
                    name: "Buy",
                    price: 100,
                    active: true,
                    createdAt: new Date()
                }
            ];

            await productsCollection.insertMany(defaultProducts);
            console.log("✓ Default products seeded (Transport: 200, Buy: 100)");
        }
    } catch (error) {
        console.error("Product seeding error:", error.message);
    }
}

// Close database connection
async function closeDB() {
    if (client) {
        await client.close();
        console.log("✓ Database connection closed");
    }
}

module.exports = {
    connectDB,
    getDB,
    getClient,
    updateWalletAtomic,
    getOrCreateWallet,
    getWalletBalance,
    getTransactionHistory,
    getProducts,
    seedProducts,
    closeDB
};
