"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/config/prisma");
const password_1 = require("../src/utils/password");
const tenantAUsers = [
    { email: 'admin@acme.com', username: 'admin', role: 'ADMIN' },
    { email: 'agent@acme.com', username: 'agent', role: 'AGENT' },
    { email: 'client@acme.com', username: 'client', role: 'CLIENT' },
    { email: 'nurse@acme.com', username: 'nurse', role: 'AGENT' },
    { email: 'doctor@acme.com', username: 'doctor', role: 'AGENT' },
    { email: 'patient2@acme.com', username: 'patient2', role: 'CLIENT' }
];
const ensureUniqueUsername = async (preferred, existingUserId) => {
    let candidate = preferred;
    let suffix = 2;
    while (true) {
        const found = await prisma_1.prisma.user.findUnique({ where: { username: candidate } });
        if (!found || found.id === existingUserId) {
            return candidate;
        }
        candidate = `${preferred}_${suffix}`;
        suffix += 1;
    }
};
const upsertUserByEmail = async (tenantId, seedUser, passwordHash) => {
    const existing = await prisma_1.prisma.user.findUnique({
        where: {
            tenantId_email: {
                tenantId,
                email: seedUser.email
            }
        }
    });
    const resolvedUsername = await ensureUniqueUsername(seedUser.username, existing?.id);
    if (existing) {
        return prisma_1.prisma.user.update({
            where: { id: existing.id },
            data: {
                username: resolvedUsername,
                role: seedUser.role,
                passwordHash
            }
        });
    }
    return prisma_1.prisma.user.create({
        data: {
            tenantId,
            email: seedUser.email,
            username: resolvedUsername,
            passwordHash,
            role: seedUser.role
        }
    });
};
const run = async () => {
    const tenantA = await prisma_1.prisma.tenant.upsert({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        update: {
            name: 'Public Healthcare Chat'
        },
        create: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Public Healthcare Chat'
        }
    });
    const tenantB = await prisma_1.prisma.tenant.upsert({
        where: { id: '22222222-2222-2222-2222-222222222222' },
        update: { name: 'Beta Clinic' },
        create: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Beta Clinic'
        }
    });
    const passwordHash = await (0, password_1.hashPassword)('Password123!');
    const createdTenantAUsers = [];
    for (const seedUser of tenantAUsers) {
        createdTenantAUsers.push(await upsertUserByEmail(tenantA.id, seedUser, passwordHash));
    }
    await upsertUserByEmail(tenantB.id, { email: 'admin@beta.com', username: 'beta_admin', role: 'ADMIN' }, passwordHash);
    let globalConversation = await prisma_1.prisma.conversation.findFirst({
        where: {
            tenantId: tenantA.id,
            isGlobal: true
        }
    });
    if (!globalConversation) {
        globalConversation = await prisma_1.prisma.conversation.create({
            data: {
                tenantId: tenantA.id,
                isGlobal: true
            }
        });
    }
    await Promise.all(createdTenantAUsers.map((user) => prisma_1.prisma.conversationParticipant.upsert({
        where: {
            conversationId_userId: {
                conversationId: globalConversation.id,
                userId: user.id
            }
        },
        update: {},
        create: {
            conversationId: globalConversation.id,
            userId: user.id
        }
    })));
    const existingWelcome = await prisma_1.prisma.message.findFirst({
        where: {
            conversationId: globalConversation.id,
            tenantId: tenantA.id
        }
    });
    if (!existingWelcome) {
        const admin = createdTenantAUsers.find((user) => user.username === 'admin');
        if (admin) {
            await prisma_1.prisma.message.create({
                data: {
                    tenantId: tenantA.id,
                    conversationId: globalConversation.id,
                    senderId: admin.id,
                    type: 'TEXT',
                    content: 'Welcome to the global healthcare system chat.'
                }
            });
        }
    }
};
run()
    .catch(async (error) => {
    console.error(error);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
