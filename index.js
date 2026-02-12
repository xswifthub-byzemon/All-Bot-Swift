// ===============================
// Swift Hub Core - FIX Giveaway DM
// By Pai 💖 For ซีม่อน
// ===============================

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    PermissionFlagsBits,
    REST,
    Routes,
    ActivityType,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder
} = require('discord.js');

const ms = require('ms');

// ===== CONFIG =====
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN';
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID';
const OWNER_ID = process.env.OWNER_ID || 'ใส่_OWNER_ID';

// ===== DATABASE (RAM) =====
const activeGiveaways = new Map();
const giveawaySetup = new Map();
const db = { users: {}, config: { antiLink: [] } };

// ===== ERROR PROTECT =====
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ===== CLIENT =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ===== SLASH =====
const commands = [
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('เปิดระบบ Giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// ===== READY =====
client.once('ready', async () => {

    console.log('✅ Swift Hub Core Ready');

    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
    } catch (e) {
        console.error(e);
    }

});

// ================================
// INTERACTION
// ================================
client.on('interactionCreate', async (interaction) => {

    // ====================
    // SLASH
    // ====================
    if (interaction.isChatInputCommand()) {

        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ เฉพาะซีม่อน', ephemeral: true });
        }

        if (interaction.commandName === 'giveaway') {

            const embed = new EmbedBuilder()
                .setColor('Pink')
                .setTitle('🎉 ตั้งค่า Giveaway')
                .setDescription('เลือกรูปแบบรางวัล');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('gw_link')
                    .setLabel('🔗 Link')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('gw_text')
                    .setLabel('📝 Text')
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    // ====================
    // SET TYPE
    // ====================
    if (interaction.isButton()) {

        if (interaction.customId.startsWith('gw_')) {

            const type = interaction.customId.replace('gw_', '');

            giveawaySetup.set(interaction.user.id, {
                prizeType: type
            });

            const modal = new ModalBuilder()
                .setCustomId('gw_modal')
                .setTitle('ตั้งค่า Giveaway');

            const prize = new TextInputBuilder()
                .setCustomId('prize')
                .setLabel('รางวัล')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const time = new TextInputBuilder()
                .setCustomId('time')
                .setLabel('เวลา (1m / 1h)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(prize),
                new ActionRowBuilder().addComponents(time)
            );

            return interaction.showModal(modal);
        }
    }

    // ====================
    // MODAL
    // ====================
    if (interaction.isModalSubmit()) {

        if (interaction.customId === 'gw_modal') {

            const setup = giveawaySetup.get(interaction.user.id);

            setup.prize = interaction.fields.getTextInputValue('prize');
            setup.time = interaction.fields.getTextInputValue('time');

            giveawaySetup.set(interaction.user.id, setup);

            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('gw_channel')
                    .setPlaceholder('เลือกห้อง')
                    .addChannelTypes(ChannelType.GuildText)
            );

            return interaction.reply({
                content: 'เลือกห้องลงกิจกรรม',
                components: [row],
                ephemeral: true
            });
        }
    }

    // ====================
    // SELECT CHANNEL
    // ====================
    if (interaction.isChannelSelectMenu()) {

        if (interaction.customId === 'gw_channel') {

            const setup = giveawaySetup.get(interaction.user.id);

            const ch = interaction.guild.channels.cache.get(
                interaction.values[0]
            );

            const embed = new EmbedBuilder()
                .setColor('Gold')
                .setTitle('🎉 GIVEAWAY')
                .setDescription(`🎁 รางวัล: ||DM||\nกดเข้าร่วมเลย`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_gw')
                    .setLabel('🎉 Join')
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await ch.send({
                embeds: [embed],
                components: [row]
            });

            activeGiveaways.set(msg.id, {
                id: msg.id,
                channel: ch.id,
                prize: setup.prize,
                type: setup.prizeType,
                duration: ms(setup.time),
                users: []
            });

            return interaction.update({
                content: '✅ เปิดกิจกรรมแล้ว',
                components: []
            });
        }
    }

    // ====================
    // JOIN
    // ====================
    if (interaction.isButton()) {

        if (interaction.customId === 'join_gw') {

            const gw = activeGiveaways.get(interaction.message.id);

            if (!gw) return;

            if (gw.users.includes(interaction.user.id)) {
                return interaction.reply({
                    content: '⚠️ ลงแล้ว',
                    ephemeral: true
                });
            }

            if (gw.users.length === 0) {
                setTimeout(() => endGiveaway(gw), gw.duration);
            }

            gw.users.push(interaction.user.id);

            return interaction.reply({
                content: '✅ เข้าร่วมแล้ว',
                ephemeral: true
            });
        }
    }

    // ====================
    // CLAIM (FIXED)
    // ====================
    if (interaction.isButton()) {

        if (interaction.customId.startsWith('claim_')) {

            const id = interaction.customId.replace('claim_', '');
            const gw = activeGiveaways.get(id);

            if (!gw || !gw.winner) {
                return interaction.reply({
                    content: '❌ ข้อมูลหาย',
                    ephemeral: true
                });
            }

            if (gw.winner !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ ไม่ใช่ผู้ชนะ',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {

                const embed = new EmbedBuilder()
                    .setColor('Gold')
                    .setTitle('🎁 ของรางวัล')
                    .setDescription(`\`\`\`${gw.prize}\`\`\``);

                await interaction.user.send({
                    embeds: [embed]
                });

                await interaction.editReply('✅ ส่ง DM แล้ว');

            } catch {

                await interaction.editReply('❌ เปิด DM ก่อน');
            }
        }
    }

});

// ================================
// END GIVEAWAY
// ================================
async function endGiveaway(gw) {

    const ch = client.channels.cache.get(gw.channel);
    if (!ch) return;

    if (gw.users.length === 0) return;

    const winner =
        gw.users[Math.floor(Math.random() * gw.users.length)];

    gw.winner = winner;

    activeGiveaways.set(gw.id, gw);

    const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🏆 ผู้ชนะ')
        .setDescription(`<@${winner}>`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`claim_${gw.id}`) // FIXED
            .setLabel('🎁 รับรางวัล')
            .setStyle(ButtonStyle.Success)
    );

    const msg = await ch.messages.fetch(gw.id);

    await msg.edit({
        embeds: [embed],
        components: [row]
    });

}

// ================================
client.login(TOKEN);
