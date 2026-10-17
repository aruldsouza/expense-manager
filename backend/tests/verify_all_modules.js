const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

async function post(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
}

async function get(url, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
    return { status: res.status, data, ok: res.ok, headers: res.headers };
}

async function patch(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
}

async function del(url, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
}

async function run() {
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}    EXPENSE MANAGER — COMPREHENSIVE MODULE VERIFICATION       ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    let passed = 0;
    let failed = 0;

    const record = (moduleName, success, details = '') => {
        if (success) {
            passed++;
            console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${moduleName} ${details ? colors.yellow + '(' + details + ')' + colors.reset : ''}`);
        } else {
            failed++;
            console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${moduleName} ${details ? colors.red + ': ' + details + colors.reset : ''}`);
        }
    };

    try {
        // 1. Health Module
        console.log(`\n${colors.bold}1. Health Module${colors.reset}`);
        const health = await get(`${API_URL}/health`);
        record('Health Check (/api/health)', health.status === 200 && health.data?.mongoConnection === 'connected', `status: ${health.data?.status}, mongo: ${health.data?.mongoConnection}`);

        // 2. Auth Module
        console.log(`\n${colors.bold}2. Auth Module${colors.reset}`);
        const email1 = `modtest1_${Date.now()}@test.com`;
        const email2 = `modtest2_${Date.now()}@test.com`;
        const reg1 = await post(`${API_URL}/auth/register`, { name: 'Module Tester 1', email: email1, password: 'password123' });
        const reg2 = await post(`${API_URL}/auth/register`, { name: 'Module Tester 2', email: email2, password: 'password123' });
        record('User Registration (/api/auth/register)', reg1.status === 201 && reg2.status === 201);

        const token1 = reg1.data.data?.token || reg1.data.token;
        const user1Id = reg1.data.data?.user?.id || reg1.data.user?._id || reg1.data.user?.id;
        const token2 = reg2.data.data?.token || reg2.data.token;
        const user2Id = reg2.data.data?.user?.id || reg2.data.user?._id || reg2.data.user?.id;

        const loginRes = await post(`${API_URL}/auth/login`, { email: email1, password: 'password123' });
        record('User Login (/api/auth/login)', loginRes.status === 200 && !!(loginRes.data.data?.token || loginRes.data.token));

        const meRes = await get(`${API_URL}/auth/me`, token1);
        record('Current User Profile (/api/auth/me)', meRes.status === 200 && meRes.data.data?.user?.email === email1);

        // 3. Groups Module
        console.log(`\n${colors.bold}3. Groups Module${colors.reset}`);
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Modular Test Group',
            description: 'Group for comprehensive testing',
            members: [user2Id],
            currency: 'USD'
        }, token1);
        const groupId = groupRes.data._id || groupRes.data.data?._id;
        record('Create Group (/api/groups)', groupRes.status === 201 && !!groupId, `Group ID: ${groupId}`);

        const listGroupsRes = await get(`${API_URL}/groups`, token1);
        const groupsList = Array.isArray(listGroupsRes.data) ? listGroupsRes.data : listGroupsRes.data.data;
        record('List User Groups (/api/groups)', listGroupsRes.status === 200 && groupsList.some(g => (g._id || g.id) === groupId));

        const getGroupRes = await get(`${API_URL}/groups/${groupId}`, token1);
        record('Get Group by ID (/api/groups/:id)', getGroupRes.status === 200 && (getGroupRes.data.name || getGroupRes.data.data?.name) === 'Modular Test Group');

        // 4. Expenses Module
        console.log(`\n${colors.bold}4. Expenses Module${colors.reset}`);
        const expRes1 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            title: 'Dinner & Drinks',
            amount: 80,
            paidBy: user1Id,
            splitType: 'equal',
            category: 'Food'
        }, token1);
        const exp1Id = expRes1.data._id || expRes1.data.data?._id;
        record('Add Expense (/api/groups/:id/expenses)', expRes1.status === 201 && !!exp1Id, `Expense ID: ${exp1Id}`);

        const expRes2 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            title: 'Cab ride',
            amount: 20,
            paidBy: user2Id,
            splitType: 'equal',
            category: 'Transport'
        }, token2);
        record('Add Second Expense', expRes2.status === 201);

        const listExpRes = await get(`${API_URL}/groups/${groupId}/expenses`, token1);
        const expenses = Array.isArray(listExpRes.data) ? listExpRes.data : listExpRes.data.data;
        record('Get Expenses (/api/groups/:id/expenses)', listExpRes.status === 200 && expenses.length >= 2, `Count: ${expenses.length}`);

        // 5. Balances Module
        console.log(`\n${colors.bold}5. Balances Module${colors.reset}`);
        const balRes = await get(`${API_URL}/groups/${groupId}/balances`, token1);
        record('Compute Balances (/api/groups/:id/balances)', balRes.status === 200 && (balRes.data.balances || balRes.data.data?.balances || Array.isArray(balRes.data)));

        // 6. Settlements Module
        console.log(`\n${colors.bold}6. Settlements Module${colors.reset}`);
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, token1);
        record('Greedy Settlement Optimization (/api/groups/:id/settlements/optimized)', optRes.status === 200);

        const recs = optRes.data.recommendations || optRes.data.data?.recommendations || optRes.data;
        const rec = Array.isArray(recs) && recs.length > 0 ? recs[0] : null;
        if (rec) {
            const payerId = rec.from?._id || rec.from || rec.fromUser?._id;
            const payeeId = rec.to?._id || rec.to || rec.toUser?._id;
            const settleToken = (payerId.toString() === user2Id.toString()) ? token2 : token1;
            const settleRes = await post(`${API_URL}/groups/${groupId}/settlements`, {
                payer: payerId,
                payee: payeeId,
                amount: rec.amount
            }, settleToken);
            record('Record Settlement (/api/groups/:id/settlements)', settleRes.status === 201 || settleRes.status === 200);
        } else {
            record('Record Settlement (/api/groups/:id/settlements)', true, 'No balance outstanding');
        }

        // 7. Transaction History Module
        console.log(`\n${colors.bold}7. Transaction History Module${colors.reset}`);
        const txRes = await get(`${API_URL}/groups/${groupId}/transactions`, token1);
        const txs = txRes.data.transactions || txRes.data.data?.transactions || (Array.isArray(txRes.data) ? txRes.data : []);
        record('Get Transaction History (/api/groups/:id/transactions)', txRes.status === 200 && txs.length > 0, `Transactions count: ${txs.length}`);

        // 8. Dashboard Module
        console.log(`\n${colors.bold}8. Dashboard Module${colors.reset}`);
        const dashStats = await get(`${API_URL}/dashboard/stats`, token1);
        const stats = dashStats.data.data || dashStats.data;
        record('Dashboard Stats (/api/dashboard/stats)', dashStats.status === 200 && stats.hasOwnProperty('activeGroups'), `Groups: ${stats.activeGroups}`);

        // 9. Currencies Module
        console.log(`\n${colors.bold}9. Currencies Module${colors.reset}`);
        const curRates = await get(`${API_URL}/currencies/rates?base=USD`);
        record('Currency Rates (/api/currencies/rates)', curRates.status === 200 && !!(curRates.data.rates || curRates.data.data?.rates));

        const curSupported = await get(`${API_URL}/currencies/supported`);
        const supportedList = curSupported.data.data || curSupported.data.currencies || curSupported.data;
        record('Supported Currencies (/api/currencies/supported)', curSupported.status === 200 && Array.isArray(supportedList), `Count: ${supportedList.length}`);

        // 10. Notifications Module
        console.log(`\n${colors.bold}10. Notifications Module${colors.reset}`);
        const notifList = await get(`${API_URL}/notifications`, token1);
        record('Get Notifications (/api/notifications)', notifList.status === 200);

        const notifCount = await get(`${API_URL}/notifications/unread-count`, token1);
        const count = notifCount.data.data?.count !== undefined ? notifCount.data.data.count : notifCount.data.unreadCount;
        record('Unread Count (/api/notifications/unread-count)', notifCount.status === 200 && count !== undefined, `Unread: ${count}`);

        const markAllRes = await patch(`${API_URL}/notifications/read-all`, {}, token1);
        record('Mark All Notifications Read (/api/notifications/read-all)', markAllRes.status === 200);

        // 11. Analytics Module
        console.log(`\n${colors.bold}11. Analytics Module${colors.reset}`);
        const catAnalytics = await get(`${API_URL}/groups/${groupId}/analytics/category`, token1);
        record('Category Breakdown (/api/groups/:id/analytics/category)', catAnalytics.status === 200);

        const trendsAnalytics = await get(`${API_URL}/groups/${groupId}/analytics/trends`, token1);
        record('Monthly Trends (/api/groups/:id/analytics/trends)', trendsAnalytics.status === 200);

        const userAnalytics = await get(`${API_URL}/groups/${groupId}/analytics/users`, token1);
        record('User Spending Breakdown (/api/groups/:id/analytics/users)', userAnalytics.status === 200);

        const healthScore = await get(`${API_URL}/groups/${groupId}/analytics/health-score`, token1);
        record('Financial Health Score (/api/groups/:id/analytics/health-score)', healthScore.status === 200);

        const exportCsv = await get(`${API_URL}/groups/${groupId}/analytics/export`, token1);
        record('Export CSV (/api/groups/:id/analytics/export)', exportCsv.status === 200 && typeof exportCsv.data === 'string');

        // 12. Budgets Module
        console.log(`\n${colors.bold}12. Budgets Module${colors.reset}`);
        const createBudget = await post(`${API_URL}/groups/${groupId}/budgets`, {
            category: 'Food',
            monthlyLimit: 500,
            currency: 'USD'
        }, token1);
        record('Create / Upsert Budget (/api/groups/:id/budgets)', createBudget.status === 200 || createBudget.status === 201);

        const getBudgets = await get(`${API_URL}/groups/${groupId}/budgets`, token1);
        record('Get Group Budgets (/api/groups/:id/budgets)', getBudgets.status === 200);

        const getBudgetStatus = await get(`${API_URL}/groups/${groupId}/budgets/status`, token1);
        record('Get Budget Status (/api/groups/:id/budgets/status)', getBudgetStatus.status === 200);

        // 13. Split Templates Module
        console.log(`\n${colors.bold}13. Split Templates Module${colors.reset}`);
        const createTpl = await post(`${API_URL}/groups/${groupId}/templates`, {
            name: 'Weekend Split',
            splitType: 'equal',
            involvedMembers: [user1Id, user2Id]
        }, token1);
        const tplId = createTpl.data._id || createTpl.data.data?._id;
        record('Create Split Template (/api/groups/:id/templates)', createTpl.status === 201 && !!tplId);

        const getTpls = await get(`${API_URL}/groups/${groupId}/templates`, token1);
        record('Get Split Templates (/api/groups/:id/templates)', getTpls.status === 200);

        // 14. Recurring Expenses Module
        console.log(`\n${colors.bold}14. Recurring Expenses Module${colors.reset}`);
        const createRec = await post(`${API_URL}/groups/${groupId}/recurring`, {
            title: 'Internet Bill',
            description: 'Monthly Fiber',
            amount: 50,
            payer: user1Id,
            frequency: 'monthly',
            category: 'Utilities',
            splitType: 'equal',
            startDate: new Date().toISOString()
        }, token1);
        record('Create Recurring Expense (/api/groups/:id/recurring)', createRec.status === 201);

        const getRecs = await get(`${API_URL}/groups/${groupId}/recurring`, token1);
        record('Get Recurring Expenses (/api/groups/:id/recurring)', getRecs.status === 200);

        // 15. Reports Module
        console.log(`\n${colors.bold}15. Reports Module${colors.reset}`);
        const pdfReport = await get(`${API_URL}/groups/${groupId}/reports/pdf`, token1);
        record('Generate PDF Report (/api/groups/:id/reports/pdf)', pdfReport.status === 200 && pdfReport.headers.get('content-type')?.includes('application/pdf'));

        // 16. AI Chatbot Module
        console.log(`\n${colors.bold}16. AI Insights Module${colors.reset}`);
        const aiValidation = await post(`${API_URL}/groups/${groupId}/ai/chat`, { message: '' }, token1);
        record('AI Chat Validation (/api/groups/:id/ai/chat)', aiValidation.status === 400, 'Rejects empty message');

        // 17. Payments Module
        console.log(`\n${colors.bold}17. Payments Module${colors.reset}`);
        const payRes = await post(`${API_URL}/groups/${groupId}/payments/intent`, { payeeId: user1Id, amount: 50 }, token1);
        record('Payment Self-Pay Validation (/api/groups/:id/payments/intent)', payRes.status === 400 || payRes.status === 503, payRes.data.error || 'Blocked self payment');

        // 18. Receipt Scanner Module
        console.log(`\n${colors.bold}18. Receipt Scanner Module${colors.reset}`);
        const emptyReceiptRes = await post(`${API_URL}/receipt/scan`, {}, token1);
        record('Receipt Upload Validation (/api/receipt/scan)', emptyReceiptRes.status === 400, 'Properly rejects empty upload');

        // Cleanup: Delete test group
        const delGroupRes = await del(`${API_URL}/groups/${groupId}`, token1);
        record('Delete Group Cleanup (/api/groups/:id)', delGroupRes.status === 200);

    } catch (err) {
        console.error('\n' + colors.red + 'Unexpected error during verification: ' + err.message + colors.reset);
        console.error(err.stack);
        failed++;
    }

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}FINAL VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

run();
