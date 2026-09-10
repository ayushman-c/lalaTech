# MongoDB Atlas Setup Guide

## Step 1: Create Free Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and sign up

## Step 2: Create Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free)
3. Select a region close to you
4. Click "Create"

## Step 3: Create Database User
1. Go to "Database Access" under Security
2. Click "Add New Database User"
3. Username: `taskflow_user`
4. Password: `TaskFlow2024!`
5. Click "Add User"

## Step 4: Whitelist IP
1. Go to "Network Access" under Security
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

## Step 5: Get Connection String
1. Go to "Database" and click "Connect"
2. Click "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password

## Step 6: Update .env
Update `backend/.env` with:
```
MONGODB_URI=mongodb+srv://taskflow_user:TaskFlow2024!@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
```

## Step 7: Seed Database
```bash
cd backend
npm run seed
```
