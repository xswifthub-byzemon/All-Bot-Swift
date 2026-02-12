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
    TextInputStyle
} = require('discord.js');
const ms = require('ms'); 

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

let antiLinkChannels = []; 

// --- 🛡️ ระบบกันบอทตาย ---
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command ทั้งหมด ---
const commands = [
    new SlashCommandBuilder().setName('setup-verify').setDescription('สร้างหน้า Panel รับยศ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('เลือกยศ').setRequired(true)),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋ว').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติสมาชิก').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('📢 ประกาศข่าวสาร (Admin Only)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหา').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูปประกอบ')),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความในห้องนี้').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวน (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เริ่มกิจกรรมแจกรางวัล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('prize').setDescription('ของรางวัล').setRequired(true)).addStringOption(o => o.setName('duration').setDescription('เวลา (เช่น 1m, 1h)').setRequired(true)).addIntegerOption(o => o.setName('winners').setDescription('จำนวนผู้ชนะ').setMinValue(1).setRequired(true)),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้อง').addChannelTypes(ChannelType.GuildText).setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงาน ---
client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) รายงานตัวแล้วค่ะ!`);
    
    const statusMessages = [
        "⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", 
        "🚀 ระบบยืนยันตัวตน & ตั๋ว 24/7", "🛡️ Swift Hub Security", "✨ ยินดีต้อนรับสู่ xSwift Hub",
        "📩 ฝากบอกข้อความทาง DM ได้น้า", "🤖 บอททำงานปกติ 100%", "💻 Zemon Dev is Coding..."
    ];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 

    setInterval(async () => {
        client.guilds.cache.forEach(async guild => {
            try {
                await guild.members.fetch(); 
                const total = guild.memberCount;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const humans = total - bots;
                const hCh = guild.channels.cache.find(c => c.name.startsWith('Mw 👨・Members:'));
                const bCh = guild.channels.cache.find(c => c.name.startsWith('Bot 🤖・Bots:'));
                const tCh = guild.channels.cache.find(c => c.name.startsWith('All 🌎・Total:'));
                if (hCh) hCh.setName(`Mw 👨・Members: ${humans.toLocaleString()}`).catch(() => {});
                if (bCh) bCh.setName(`Bot 🤖・Bots: ${bots.toLocaleString()}`).catch(() => {});
                if (tCh) tCh.setName(`All 🌎・Total: ${total.toLocaleString()}`).catch(() => {});
            } catch (err) {}
        });
    }, 600000);

    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
});

// --- 🛡️ ระบบ Anti-Link ---
client.on('messageCreate', async message => {
    if (message.author.bot || !antiLinkChannels.includes(message.channelId)) return;
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content)) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send({ content: `❌ **ระวังค่ะคุณ <@${message.author.id}>!** ห้องนี้ห้ามส่งลิงก์นะคะ ปายลบออกน้า~ 🛡️` });
        setTimeout(() => warn.delete().catch(() => {}), 5000);
    }
});

// --- 👂 Interaction Handler ---
client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName !== 'giveaway') await interaction.deferReply({ ephemeral: true });

        try {
            if (interaction.commandName === 'setup-verify') {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตน ✨').setDescription(`กดปุ่มรับยศ <@&${role.id}> ค่ะ`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }

            if (interaction.commandName === 'setup-ticket') {
                const embed = new EmbedBuilder().setColor('#00BFFF').setTitle('📩 ติดต่อสอบถาม / สั่งซื้อ 🛒').setDescription(`กดปุ่มเพื่อเปิดตั๋วส่วนตัวค่ะ`).setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg?ex=698ec146&is=698d6fc6&hm=aaeea6b0b0495ba731097654467c894e4a143bf26928bd961eaa0fc751621946&');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('เปิดตั๋วติดต่อ').setEmoji('📩').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }

            if (interaction.commandName === 'setup-stats') {
                await interaction.guild.members.fetch();
                const total = interaction.guild.memberCount;
                const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
                const humans = total - bots;
                const cat = await interaction.guild.channels.create({ name: '📊 SERVER STATS', type: ChannelType.GuildCategory, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }] });
                await interaction.guild.channels.create({ name: `Mw 👨・Members: ${humans}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.guild.channels.create({ name: `All 🌎・Total: ${total}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.guild.channels.create({ name: `Bot 🤖・Bots: ${bots}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.editReply('✅ Done!');
            }

            if (interaction.commandName === 'announce') {
                const title = interaction.options.getString('title');
                const msg = interaction.options.getString('message');
                const img = interaction.options.getAttachment('image');
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`📢 ${title}`).setDescription(msg).setTimestamp().setFooter({ text: `โดย: ${interaction.user.username}` });
                if (img) embed.setImage(img.url);
                await interaction.channel.send({ content: '@everyone', embeds: [embed] });
                await interaction.editReply('✅ Sent!');
            }

            if (interaction.commandName === 'clear') {
                const amt = interaction.options.getInteger('amount');
                await interaction.channel.bulkDelete(amt, true);
                await interaction.editReply(`🧹 Cleared ${amt} messages!`);
            }

            if (interaction.commandName === 'setup-tell-dm') {
                const embed = new EmbedBuilder().setColor('#A020F0').setTitle('💌 ฝากบอกข้อความ (Tell DM)').setDescription(`กดปุ่มเพื่อฝากบอกข้อความหาเพื่อนทาง DM ค่ะ`).setImage('https://i.pinimg.com/originals/c9/22/68/c92268d92cf2dbf96e3195683d9d3afc.gif');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_tell_dm_modal').setLabel('ส่งข้อความฝากบอก').setEmoji('📩').setStyle(ButtonStyle.Secondary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }

            if (interaction.commandName === 'setup-antilink') {
                const ch = interaction.options.getChannel('channel');
                if (!antiLinkChannels.includes(ch.id)) antiLinkChannels.push(ch.id);
                await interaction.editReply(`🛡️ ห้อง <#${ch.id}> กันลิงก์เรียบร้อย!`);
            }

            if (interaction.commandName === 'giveaway') {
                const prize = interaction.options.getString('prize');
                const dur = interaction.options.getString('duration');
                const wins = interaction.options.getInteger('winners');
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎉 GIVEAWAY! 🎉').setDescription(`รางวัล: **${prize}**\nผู้โชคดี: **${wins} ท่าน**\nกดปุ่มด้านล่างเพื่อเข้าร่วม!`).setFooter({ text: `จบใน: ${dur}` });
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วม').setEmoji('🎁').setStyle(ButtonStyle.Primary));
                const gmsg = await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ เริ่มกิจกรรม!', ephemeral: true });
                let entry = [];
                const col = gmsg.createMessageComponentCollector({ time: ms(dur) });
                col.on('collect', i => {
                    if (entry.includes(i.user.id)) return i.reply({ content: 'กดไปแล้วน้า!', ephemeral: true });
                    entry.push(i.user.id);
                    i.reply({ content: 'เข้าร่วมสำเร็จ! 💖', ephemeral: true });
                });
                col.on('end', () => {
                    if (entry.length === 0) return gmsg.edit({ content: '❌ ไม่มีคนเล่นเลยง่า...', components: [] });
                    const winners = entry.sort(() => 0.5 - Math.random()).slice(0, wins);
                    gmsg.edit({ content: `🎊 จบแล้ว! ผู้ชนะคือ: ${winners.map(w => `<@${w}>`).join(', ')}`, components: [] });
                });
            }
        } catch (e) { console.error(e); }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('verify_button_')) {
            await interaction.deferReply({ ephemeral: true });
            const rId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(rId);
            if (role) {
                await interaction.member.roles.add(role).then(() => interaction.editReply('✅ ได้ยศแล้วค่ะ!')).catch(() => interaction.editReply('❌ ยศปายต่ำกว่าค่ะ'));
            }
        }

        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.editReply('❌ มีห้องอยู่แล้วค่ะ');
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const emb = new EmbedBuilder().setColor('#00FF00').setTitle(`🎫 Ticket: ${interaction.user.tag}`).setDescription(`รอซีม่อนสักครู่นะคะ`).setTimestamp();
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ content: `<@${OWNER_ID}>`, embeds: [emb], components: [btn] });
            await interaction.editReply(`✅ เปิดตั๋วแล้ว: <#${ch.id}>`);
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 Deleting in 5s...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        if (interaction.customId === 'open_tell_dm_modal') {
            const modal = new ModalBuilder().setCustomId('tell_dm_modal').setTitle('💌 ฝากบอกข้อความ');
            const idIn = new TextInputBuilder().setCustomId('target_id').setLabel("User ID คนรับ").setStyle(TextInputStyle.Short).setRequired(true);
            const msgIn = new TextInputBuilder().setCustomId('dm_msg').setLabel("ข้อความ").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(idIn), new ActionRowBuilder().addComponents(msgIn));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'tell_dm_modal') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const target = await client.users.fetch(interaction.fields.getTextInputValue('target_id'));
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('💌 มีข้อความฝากบอกค่ะ!').setDescription(`**จาก:** ${interaction.user.tag}\n**ข้อความ:** ${interaction.fields.getTextInputValue('dm_msg')}`).setTimestamp();
            await target.send({ embeds: [embed] });
            await interaction.editReply(`✅ ส่งถึง ${target.tag} แล้วค่ะ!`);
        } catch { await interaction.editReply('❌ ส่งไม่สำเร็จ (ID ผิดหรือปิด DM)'); }
    }
});

client.login(TOKEN);
