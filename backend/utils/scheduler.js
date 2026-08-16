const cron = require('node-cron');
const RecurringExpense = require('../models/RecurringExpense');
const { generateExpenseFromRecurring } = require('../controllers/recurringExpenseController');

/**
 * Runs every minute. Finds all active recurring expenses whose nextRunAt
 * has passed and auto-generates a real Expense document for each.
 */
const startScheduler = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Find all active recurring expenses that are due
            const dueTasks = await RecurringExpense.find({
                status: 'active',
                nextRunAt: { $lte: now }
            });

            if (dueTasks.length === 0) return;

            console.log(`⏰ Scheduler: Processing ${dueTasks.length} recurring expense(s)...`);

            for (const task of dueTasks) {
                try {
                    // For custom frequency, only run if the cron expression matches *now*
                    // We handle this by only scheduling them at the right moment (nextRunAt was set when created/resumed)
                    const expense = await generateExpenseFromRecurring(task);

                    if (expense) {
                        task.lastGeneratedAt = now;

                        // Compute next run based on frequency
                        if (task.frequency === 'daily') {
                            const next = new Date(task.nextRunAt);
                            next.setDate(next.getDate() + 1);
                            task.nextRunAt = next;
                        } else if (task.frequency === 'weekly') {
                            const next = new Date(task.nextRunAt);
                            next.setDate(next.getDate() + 7);
                            task.nextRunAt = next;
                        } else if (task.frequency === 'monthly') {
                            const next = new Date(task.nextRunAt);
                            next.setMonth(next.getMonth() + 1);
                            task.nextRunAt = next;
                        } else if (task.frequency === 'custom') {
                            // For custom cron, use node-cron's getNextDate if available,
                            // otherwise advance by 1 day as a safe fallback.
                            // Users can update nextRunAt manually via the PUT endpoint.
                            const next = new Date(now);
                            next.setDate(next.getDate() + 1);
                            task.nextRunAt = next;
                        }

                        await task.save();
                        console.log(`  ✅ Generated expense: "${task.description}" for group ${task.group}`);
                    }
                } catch (taskErr) {
                    console.error(`  ❌ Failed to process recurring expense ${task._id}:`, taskErr.message);
                }
            }
        } catch (err) {
            console.error('❌ Scheduler error:', err.message);
        }
    });

    console.log('⏰ Recurring expense scheduler started (runs every minute)');
};

module.exports = { startScheduler };
