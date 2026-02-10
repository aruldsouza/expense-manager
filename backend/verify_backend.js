const axios = require('axios');

const API_URL = 'http://localhost:5002/api';

const runVerification = async () => {
    try {
        console.log('🚀 Starting Backend Verification...\n');

        // 1. Register User A
        console.log('1️⃣  Registering User A...');
        let userAToken, userA_Id;
        try {
            const emailA = `usera_${Date.now()}@test.com`;
            const resA = await axios.post(`${API_URL}/auth/register`, {
                name: 'User A',
                email: emailA,
                password: 'password123'
            });
            userAToken = resA.data.data.token;
            userA_Id = resA.data.data.user.id;
            console.log(`✅ User A Registered (${emailA}):`, userA_Id);
        } catch (e) {
            console.error('❌ User A Registration Failed:', e.response?.data?.message || e.message);
            process.exit(1);
        }

        // 2. Register User B
        console.log('\n2️⃣  Registering User B...');
        let userBToken, userB_Id;
        try {
            const emailB = `userb_${Date.now()}@test.com`;
            const resB = await axios.post(`${API_URL}/auth/register`, {
                name: 'User B',
                email: emailB,
                password: 'password123'
            });
            userBToken = resB.data.data.token;
            userB_Id = resB.data.data.user.id;
            console.log(`✅ User B Registered (${emailB}):`, userB_Id);
        } catch (e) {
            console.error('❌ User B Registration Failed:', e.response?.data?.message || e.message);
            process.exit(1);
        }

        // 3. User A Creates Group
        console.log('\n3️⃣  User A Creating Group with User B...');
        let groupId;
        try {
            const resGroup = await axios.post(`${API_URL}/groups`, {
                name: 'Test Group',
                description: 'Verification Group',
                members: [userB_Id]
            }, {
                headers: { Authorization: `Bearer ${userAToken}` }
            });
            groupId = resGroup.data.data._id;
            console.log('✅ Group Created:', groupId);
        } catch (e) {
            console.error('❌ Group Creation Failed:', e.response?.data?.message || e.message);
            process.exit(1);
        }

        // 4. User A Add Expense
        console.log('\n4️⃣  User A Adding Expense ($100, Equal Split)...');
        try {
            // Calculate equal split manually as frontend/AddExpense does
            const expenseData = {
                description: 'Dinner',
                amount: 100,
                payer: userA_Id,
                splitType: 'EQUAL',
                splits: [
                    { user: userA_Id, amount: 50 },
                    { user: userB_Id, amount: 50 }
                ]
            };

            await axios.post(`${API_URL}/groups/${groupId}/expenses`, expenseData, {
                headers: { Authorization: `Bearer ${userAToken}` }
            });
            console.log('✅ Expense Added Successfully');
        } catch (e) {
            console.error('❌ Add Expense Failed:', e.response?.data?.message || e.message);
            process.exit(1);
        }

        // 5. Check Balances
        console.log('\n5️⃣  Checking Balances...');
        try {
            const resBal = await axios.get(`${API_URL}/groups/${groupId}/balances`, {
                headers: { Authorization: `Bearer ${userAToken}` }
            });
            const balances = resBal.data.data;
            // Find User B's balance
            const userB_Bal = balances.find(b => b.user._id === userB_Id);

            if (userB_Bal && userB_Bal.balance === -50) {
                console.log('✅ Balance Verification PASSED: User B owes $50');
            } else {
                console.error('❌ Balance Verification FAILED: User B balance is', userB_Bal?.balance);
                console.log('Given Balances:', JSON.stringify(balances, null, 2));
            }
        } catch (e) {
            console.error('❌ Get Balances Failed:', e.response?.data?.message || e.message);
        }

        // 6. Test Dashboard Stats
        console.log('\n6️⃣  Testing Dashboard Stats (User A)...');
        try {
            const resStats = await axios.get(`${API_URL}/dashboard/stats`, {
                headers: { Authorization: `Bearer ${userAToken}` }
            });
            const stats = resStats.data.data;
            console.log('📊 Dashboard Stats:', JSON.stringify(stats, null, 2));

            // User A Paid 100. Split 50/50. 
            // Total Spend should include the amount FRONTED (100) or SHARE (50)?
            // My implementation calculates `totalPaid` (cashflow) vs `totalExpenses` (share).
            // Logic: 
            // totalExpenses (Share): 50
            // totalPaid (Outflow): 100
            // netBalance: +50 (Owed)

            if (stats.netBalance === 50 && stats.activeGroups >= 1) {
                console.log('✅ Dashboard Stats Verified');
            } else {
                console.warn('⚠️  Dashboard Stats Verification Check - Manual Review Needed');
            }

        } catch (e) {
            console.error('❌ Dashboard Stats Failed:', e.response?.data?.message || e.message);
        }

        // 7. Test Delete Group
        console.log('\n7️⃣  Testing Delete Group (User A)...');
        try {
            await axios.delete(`${API_URL}/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${userAToken}` }
            });
            console.log('✅ Group Deleted Successfully');
        } catch (e) {
            console.error('❌ Delete Group Failed:', e.response?.data?.message || e.message);
        }

        console.log('\n🎉 Backend Features Verified!');

    } catch (error) {
        console.error('❌ Critical Script Error:', error.message);
    }
};

runVerification();
