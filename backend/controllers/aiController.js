const { GoogleGenerativeAI } = require('@google/generative-ai');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// @desc  AI chatbot for group financial insights
// @route POST /api/groups/:groupId/ai/chat
// @access Private (Viewer)
const askAI = async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            res.status(400);
            throw new Error('Message is required');
        }

        const { groupId } = req.params;

        // ─── Verify membership ────────────────────────────────────────────────
        const group = await Group.findById(groupId).populate('members.user', 'name email');
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const isMember = group.members.some(m => {
            const uid = m.user ? m.user._id.toString() : m.toString();
            return uid === req.user._id.toString();
        });
        if (!isMember) { res.status(403); throw new Error('Not authorized'); }

        // ─── Build context from real group data (last 90 days) ───────────────
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const [expenses, settlements] = await Promise.all([
            Expense.find({ group: groupId, date: { $gte: ninetyDaysAgo } })
                .populate('payer', 'name')
                .populate('splits.user', 'name')
                .sort({ date: -1 })
                .limit(100),
            Settlement.find({ group: groupId })
                .populate('payer', 'name')
                .populate('payee', 'name')
                .sort({ date: -1 })
                .limit(50)
        ]);

        // Build member balance map
        const memberNames = {};
        group.members.forEach(m => {
            const uid = m.user ? m.user._id.toString() : m.toString();
            const name = m.user ? m.user.name : 'Unknown';
            memberNames[uid] = name;
        });

        const balances = {};
        Object.keys(memberNames).forEach(id => { balances[id] = 0; });

        expenses.forEach(e => {
            const pid = e.payer._id.toString();
            if (balances[pid] !== undefined) balances[pid] += e.amount;
            e.splits.forEach(s => {
                const sid = s.user._id.toString();
                if (balances[sid] !== undefined) balances[sid] -= s.amount;
            });
        });
        settlements.forEach(s => {
            const pid = s.payer._id.toString();
            const qid = s.payee._id.toString();
            if (balances[pid] !== undefined) balances[pid] += s.amount;
            if (balances[qid] !== undefined) balances[qid] -= s.amount;
        });

        // Category totals
        const categoryTotals = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
        });

        // Top payer (who spent most)
        const memberSpend = {};
        expenses.forEach(e => {
            const name = e.payer?.name || 'Unknown';
            memberSpend[name] = (memberSpend[name] || 0) + e.amount;
        });

        // Who owes most (most negative balance)
        const debtSummary = Object.entries(balances)
            .map(([id, bal]) => ({ name: memberNames[id] || id, balance: parseFloat(bal.toFixed(2)) }))
            .sort((a, b) => a.balance - b.balance);

        const catSummary = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`)
            .join(', ');

        const balanceSummary = debtSummary
            .map(d => `${d.name}: ${d.balance >= 0 ? '+' : ''}$${d.balance}`)
            .join(', ');

        const spendSummary = Object.entries(memberSpend)
            .sort((a, b) => b[1] - a[1])
            .map(([name, amt]) => `${name}: $${amt.toFixed(2)}`)
            .join(', ');

        const systemPrompt = `You are a helpful financial assistant for a group expense tracking app called "Expense Manager".

Group Name: ${group.name}
Group Currency: ${group.currency || 'USD'}
Members: ${Object.values(memberNames).join(', ')}
Period: Last 90 days

Financial Summary:
- Total expenses recorded: ${expenses.length}
- Total expense amount: $${expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
- Spending by category: ${catSummary || 'No expenses yet'}
- Who has paid most (top spender): ${spendSummary || 'None'}
- Net balances (positive = owed money, negative = owes money): ${balanceSummary || 'All settled'}
- Total settlements recorded: ${settlements.length}

Recent expenses (up to 10):
${expenses.slice(0, 10).map(e => `- ${e.description}: $${e.amount} paid by ${e.payer?.name}, category: ${e.category}`).join('\n')}

Instructions:
- Answer questions about this group's finances using the data above.
- Be concise, friendly, and financially insightful.
- Format numbers with $ and 2 decimal places.
- If asked for a monthly summary, summarise the spending trends above.
- If the data is insufficient to answer, say so honestly.
- Always refer to members by their first names.`;

        // ─── Call Gemini API ──────────────────────────────────────────────────
        if (!process.env.GEMINI_API_KEY) {
            res.status(503);
            throw new Error('AI service is not configured. Please set GEMINI_API_KEY in the server environment.');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(message);
        const aiText = result.response.text();

        res.json({ success: true, data: { reply: aiText } });
    } catch (error) { next(error); }
};

module.exports = { askAI };
