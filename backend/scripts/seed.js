const sequelize = require('../config/db.config');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const BankAccount = require('../models/BankAccount');
const BankStatementLine = require('../models/BankStatementLine');
const Reconciliation = require('../models/Reconciliation');
const ReconciliationMatch = require('../models/ReconciliationMatch');
const PteTask = require('../models/PteTask');
const PteAttempt = require('../models/PteAttempt');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database synced for seeding...');

        // 1. Create Branches
        const hq = await Branch.create({
            name: 'Main Branch (HQ)',
            code: 'HQ-DHK',
            type: 'head',
            address: 'Banani, Dhaka',
            phone: '+8801700000001'
        });

        const uttara = await Branch.create({
            name: 'Uttara Branch',
            code: 'DHK-02',
            type: 'branch',
            address: 'Sector 7, Uttara',
            phone: '+8801700000002'
        });

        // 2. Create Users
        const seedPassword = process.env.SEED_DEFAULT_PASSWORD || require('crypto').randomBytes(12).toString('base64url');
        if (!process.env.SEED_DEFAULT_PASSWORD) {
            console.log(`Generated seed user password: ${seedPassword}`);
        }
        const hashedPassword = await bcrypt.hash(seedPassword, 10);
        
        const superAdmin = await User.create({
            name: 'Super Admin',
            email: 'admin@renetech.com',
            password: hashedPassword,
            role: 'super_admin',
            branch_id: hq.id,
            status: 'active'
        });

        const branchAdmin = await User.create({
            name: 'Uttara Manager',
            email: 'uttara@renetech.com',
            password: hashedPassword,
            role: 'branch_admin',
            branch_id: uttara.id,
            status: 'active'
        });

        // 3. Create Courses
        const pteStandard = await Course.create({
            title: 'PTE Academic Standard',
            category: 'PTE',
            base_fee: 15000,
            duration_weeks: 8,
            branch_id: hq.id
        });

        const ieltsStandard = await Course.create({
            title: 'IELTS Academic Masterclass',
            category: 'IELTS',
            base_fee: 12000,
            duration_weeks: 10,
            branch_id: hq.id
        });

        // 4. Create Batches
        const batch1 = await Batch.create({
            code: 'PTE-A3-MORNING',
            name: 'PTE Morning Batch A3',
            course_id: pteStandard.id,
            trainer_id: superAdmin.id,
            branch_id: hq.id,
            schedule: 'Mon, Wed, Fri',
            status: 'active',
            capacity: 20
        });

        const batch2 = await Batch.create({
            code: 'IELTS-E2-EVENING',
            name: 'IELTS Evening Batch E2',
            course_id: ieltsStandard.id,
            trainer_id: branchAdmin.id,
            branch_id: uttara.id,
            schedule: 'Tue, Thu',
            status: 'upcoming',
            capacity: 15
        });

        // 5. Create Leads (Headquarters)
        await Lead.bulkCreate([
            {
                name: 'Zahirul Islam',
                phone: '01911111111',
                email: 'zahir@gmail.com',
                source: 'Facebook',
                status: 'new',
                branch_id: hq.id,
                counselor_id: superAdmin.id,
                batch_interest: 'PTE Academic'
            },
            {
                name: 'Nusrat Jahan',
                phone: '01922222222',
                email: 'nusrat@gmail.com',
                source: 'Referral',
                status: 'contacted',
                branch_id: hq.id,
                counselor_id: superAdmin.id,
                batch_interest: 'IELTS Academic'
            }
        ]);

        // 6. Create Leads (Uttara Branch)
        await Lead.bulkCreate([
            {
                name: 'Ariful Haque',
                phone: '01933333333',
                email: 'arif@gmail.com',
                source: 'Google Search',
                status: 'interested',
                branch_id: uttara.id,
                counselor_id: branchAdmin.id,
                batch_interest: 'PTE Core'
            }
        ]);

        // 7. Create Students
        const stu1 = await User.create({
            name: 'Rahat Ahmed',
            email: 'rahat@student.com',
            password: hashedPassword,
            role: 'student',
            branch_id: hq.id
        });

        await Student.create({
            user_id: stu1.id,
            branch_id: hq.id,
            batch_id: batch1.id,
            enrollment_date: new Date(),
            status: 'active'
        });

        const stu2 = await User.create({
            name: 'Mitu Akter',
            email: 'mitu@student.com',
            password: hashedPassword,
            role: 'student',
            branch_id: hq.id
        });

        await Student.create({
            user_id: stu2.id,
            branch_id: hq.id,
            batch_id: batch1.id,
            enrollment_date: new Date(),
            status: 'active'
        });

        // 7. Create PTE Tasks
        await PteTask.bulkCreate([
            {
                section: 'speaking',
                type: 'Read Aloud',
                content: 'The study of humanities and social sciences provides students with the critical thinking skills necessary to navigate the complexities of the modern world.',
                correct_answer: 'humanities, critical thinking, navigate, modern world',
                max_score: 90
            },
            {
                section: 'writing',
                type: 'Summarize Written Text',
                content: 'Climate change is the defining crisis of our time and it is happening even more quickly than we feared. No corner of the globe is immune from the devastating consequences of rising temperatures.',
                correct_answer: 'climate change, crisis, devastating, globe, immune',
                max_score: 90
            }
        ]);

        // 8. Create Chart of Accounts (HQ)
        const accountsData = [
            { code: '1000', name: 'Cash in Hand', type: 'asset', branch_id: hq.id },
            { code: '1010', name: 'Main Bank Account', type: 'asset', branch_id: hq.id },
            { code: '1200', name: 'Student Fees Receivable', type: 'asset', branch_id: hq.id },
            { code: '4000', name: 'Tuition Revenue', type: 'revenue', branch_id: hq.id },
            { code: '5000', name: 'Salaries & Wages', type: 'expense', branch_id: hq.id },
            { code: '5010', name: 'Rent Expense', type: 'expense', branch_id: hq.id },
            { code: '5020', name: 'Utilities (Electricity/Net)', type: 'expense', branch_id: hq.id },
            // Uttara Branch
            { code: '1000-U', name: 'Cash (Uttara)', type: 'asset', branch_id: uttara.id },
            { code: '1010-U', name: 'Bank (Uttara)', type: 'asset', branch_id: uttara.id },
            { code: '1200-U', name: 'Fees Receivable (Uttara)', type: 'asset', branch_id: uttara.id },
            { code: '4000-U', name: 'Tuition Revenue (Uttara)', type: 'revenue', branch_id: uttara.id },
            { code: '5000-U', name: 'Salaries (Uttara)', type: 'expense', branch_id: uttara.id },
        ];

        await Account.bulkCreate(accountsData);

        // 9. Create Rooms
        await Room.bulkCreate([
            { branch_id: hq.id, name: 'Room 101', floor: '1st', capacity: 25, facilities: { projector: true, ac: true }, status: 'free' },
            { branch_id: hq.id, name: 'Room 102', floor: '1st', capacity: 20, facilities: { projector: false, ac: true }, status: 'free' },
            { branch_id: hq.id, name: 'Auditórium', floor: '2nd', capacity: 100, facilities: { stage: true, ac: true }, status: 'free' },
            { branch_id: uttara.id, name: 'Uttara Room A', floor: '3rd', capacity: 15, facilities: { whiteboard: true, ac: true }, status: 'free' }
        ]);

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

seedData();
