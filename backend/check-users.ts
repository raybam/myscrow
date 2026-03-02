import prisma from './src/lib/prisma';

async function checkUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            isProfileComplete: true,
        }
    });

    console.log('\n=== Current Users in Database ===');
    console.log(`Total users: ${users.length}\n`);

    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username || 'No username'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Profile Complete: ${user.isProfileComplete}`);
        console.log('');
    });

    await prisma.$disconnect();
}

checkUsers().catch(console.error);
