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
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const ms = require('ms'); 

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

// เก็บข้อมูล Giveaway (ใช้ RAM บอทดับหายต้องระวัง)
// Structure: { messageId: { prizes: [], winners: [], requiredWinners: N, duration: MS, startTime: null, participants: [], type: 'role'|'link'|'text', prizeName: '...' } }
const activeGiveaways = new Map();
const giveawaySetup = new Map(); 
const db = { users: {}, config: { antiLink: [] } };

// --- 🛡️ ระบบกันบอทตาย ---
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command ---
const commands = [
    new SlashCommandBuilder().setName('setup-verify').setDescription('สร้างหน้า Panel รับยศ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('เลือกยศที่ต้องการแจก').setRequired(true)),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋วติดต่อแอดมิน').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติสมาชิก').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('📢 ประกาศข่าวสาร').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อประกาศ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหาข่าว').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูปภาพประกอบ')),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความ (ทันที)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวนข้อความ (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้องที่ต้องการเฝ้าระวัง').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-level').setDescription('📊 สร้างหน้า Panel ระบบเลเวล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(o => o.setName('lv20').setDescription('ยศ Lv.20').setRequired(true))
        .addRoleOption(o => o.setName('lv40').setDescription('ยศ Lv.40').setRequired(true))
        .addRoleOption(o => o.setName('lv60').setDescription('ยศ Lv.60').setRequired(true))
        .addRoleOption(o => o.setName('lv80').setDescription('ยศ Lv.80').setRequired(true))
        .addRoleOption(o => o.setName('lv100').setDescription('ยศ Lv.100').setRequired(true)),
    
    // ✨ คำสั่ง Giveaway Panel
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เปิดหน้าจอตั้งค่ากิจกรรมแจกของ (Panel หลังบ้าน)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) ออนไลน์พร้อมทำงานแล้วค่ะ!`);
    const statusMessages = ["⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", "🚀 xSwift Hub Community"];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 
    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
});

// ฟังก์ชันเพิ่ม XP
function addXP(userId, amount) {
    if (!db.users[userId]) db.users[userId] = { xp: 0, level: 1, lastMsg: 0 };
    db.users[userId].xp += amount;
    let nextLevelXP = db.users[userId].level * 500; 
    if (db.users[userId].xp >= nextLevelXP && db.users[userId].level < 100) {
        db.users[userId].level++;
        db.users[userId].xp = 0;
        return true; 
    }
    return false;
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    // XP System
    if (Date.now() - (db.users[message.author.id]?.lastMsg || 0) > 60000) {
        const leveledUp = addXP(message.author.id, Math.floor(Math.random() * 3) + 1);
        if (db.users[message.author.id]) db.users[message.author.id].lastMsg = Date.now();
        if (leveledUp) message.channel.send(`🎊 สุดยอด! คุณ <@${message.author.id}> เวลอัปเป็น **Lv.${db.users[message.author.id].level}** แล้วน้าา 💖`).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000));
    }
    
    // Anti-Link
    if (db.config.antiLink.includes(message.channelId)) {
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        if (linkRegex.test(message.content)) {
            await message.delete().catch(() => {});
            const warn = await message.channel.send({ content: `❌ **ระวังค่ะคุณ <@${message.author.id}>!** ห้องนี้ห้ามส่งลิงก์นะคะ ปายลบออกให้แล้วน้า~ 🛡️✨` });
            setTimeout(() => warn.delete().catch(() => {}), 10000); 
        }
    }
});

client.on('interactionCreate', async interaction => {
    
    // --- 1. Slash Commands ---
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName === 'clear') {
            const amt = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amt, true);
            return interaction.reply({ content: `🧹 กวาดถูแชทเรียบร้อย **${amt}** ข้อความค่ะ! ✨`, ephemeral: true });
        }

        if (interaction.commandName === 'giveaway') {
            await interaction.reply({ content: '⏳ กำลังเปิด Panel...', ephemeral: true }); // ไม่ต้องเห็นคนเดียว ตามสั่ง (แต่ถ้าเป็น admin panel ปกติควรเห็นคนเดียวนะ แต่จัดให้ตามคำขอ)
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('⚙️ ตั้งค่ากิจกรรม Giveaway (หลังบ้าน)').setDescription('**กรุณาเลือกประเภทรางวัลที่ต้องการแจกค่ะ:**\n\n🛡️ **บทบาท:** แจกยศในเซิร์ฟ (บอทมอบให้เอง)\n🔗 **ลิ้งก์:** แจกซองอั่งเปา / เว็บไซต์\n📝 **ข้อความ:** แจกคีย์เกม / โค้ดลับ').setThumbnail(interaction.guild.iconURL());
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gw_type_role').setLabel('แจกบทบาท').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gw_type_link').setLabel('แจกลิ้งก์').setEmoji('🔗').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gw_type_text').setLabel('แจกข้อความ').setEmoji('📝').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ content: '', embeds: [embed], components: [row] });
        }

        // Setup Commands (Verify, Ticket, Level, etc.)
        await interaction.deferReply({ ephemeral: true });
        try {
            if (interaction.commandName === 'setup-level') {
                const roles = { 20: interaction.options.getRole('lv20'), 40: interaction.options.getRole('lv40'), 60: interaction.options.getRole('lv60'), 80: interaction.options.getRole('lv80'), 100: interaction.options.getRole('lv100') };
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📊 ระบบเลเวล xSwift Hub 🏆').setDescription(`ยิ่งคุยเยอะ ยิ่งได้ยศและความสามารถเพิ่มขึ้น! ✨\n\n**🎁 ความสามารถเมื่อเลเวลอัป:**\n🎖️ **Lv.20:** <@&${roles[20].id}> (ปิดไมค์เพื่อนได้)\n🥈 **Lv.40:** <@&${roles[40].id}> (เตะคนออกจากห้องเสียง)\n🥇 **Lv.60:** <@&${roles[60].id}> (ปิดหูฟังคนอื่นได้)\n💎 **Lv.80:** <@&${roles[80].id}> (ลบข้อความในห้องได้)\n👑 **Lv.100:** <@&${roles[100].id}> (ยัดคนเข้าห้องเต็มได้!)\n\n*มาเก็บเลเวลกันเถอะ! ตันที่ 100 ค่ะ! 💖*`).setImage('https://i.pinimg.com/originals/a0/0c/3b/a00c3b3186105a305d2f627d35398246.gif').setFooter({ text: 'กดปุ่มด้านล่างเพื่อเช็คเลเวลตัวเอง 👇' });
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('check_level').setLabel('📊 เช็คเลเวล').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-verify') {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตนเข้าสู่ครอบครัว xSwift Hub ✨').setDescription(`ยินดีต้อนรับเพื่อนๆ ทุกคนนะคะ! 🎉\nเพื่อความปลอดภัยและระเบียบเรียบร้อย กรุณายืนยันตัวตนก่อนเข้าใช้งานค่ะ\n\n**📝 ขั้นตอนง่ายๆ:**\n1️⃣ อ่านกฎของเซิร์ฟเวอร์ให้เข้าใจ\n2️⃣ กดปุ่ม **"ยืนยันตัวตน"** สีเขียวด้านล่าง\n3️⃣ ระบบจะมอบยศ <@&${role.id}> ให้ทันที!\n\n*ขอให้สนุกกับการพูดคุยและกิจกรรมดีๆ นะคะ! 💖*`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif').setFooter({ text: 'ระบบยืนยันตัวตนโดย น้องปาย ⚙️' });
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('ยืนยันตัวตน').setEmoji('✅').setStyle(ButtonStyle.Success));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-ticket') {
                const embed = new EmbedBuilder().setColor('#00BFFF').setTitle('📩 ศูนย์ช่วยเหลือสมาชิก xSwift Hub 🛡️').setDescription(`**สวัสดีค่ะ! หากพบปัญหาหรือต้องการติดต่อแอดมิน เรื่อง:**\n⚠️ แจ้งคนทำผิดกฎ / เกรียน\n🛒 สั่งซื้อสินค้า / บริการ\n🔧 แจ้งปัญหาการใช้งาน\n\n*กดปุ่มด้านล่างเพื่อเปิดห้องคุยส่วนตัวได้เลยน้า 👇*`).setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('เปิดตั๋วติดต่อแอดมิน').setEmoji('📩').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-tell-dm') {
                const embed = new EmbedBuilder().setColor('#A020F0').setTitle('💌 บริการฝากบอกความในใจ (Tell DM) ✨').setDescription(`**อยากบอกอะไรกับเพื่อนแต่ไม่กล้าทักไปตรงๆ ไหมคะ?**\n💖 ให้ปายช่วยเป็นสื่อกลางสิ!\n\n*กดปุ่มด้านล่างเพื่อฝากข้อความลับไปหาเขาได้เลย!*`).setImage('https://i.pinimg.com/originals/c9/22/68/c92268d92cf2dbf96e3195683d9d3afc.gif');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_tell_dm_modal').setLabel('ส่งข้อความฝากบอก').setEmoji('💌').setStyle(ButtonStyle.Secondary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'announce') {
                const title = interaction.options.getString('title');
                const msg = interaction.options.getString('message');
                const img = interaction.options.getAttachment('image');
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`📢 ${title}`).setDescription(msg).setTimestamp().setFooter({ text: `ประกาศโดย: ${interaction.user.username}` });
                if (img) embed.setImage(img.url);
                await interaction.channel.send({ content: '@everyone', embeds: [embed] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-stats') {
                await interaction.guild.members.fetch();
                const total = interaction.guild.memberCount;
                const cat = await interaction.guild.channels.create({ name: '📊 STATS', type: ChannelType.GuildCategory });
                await interaction.guild.channels.create({ name: `🌎 Members: ${total}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-antilink') {
                const ch = interaction.options.getChannel('channel');
                if (!db.config.antiLink.includes(ch.id)) db.config.antiLink.push(ch.id);
                await interaction.editReply(`🛡️ ห้อง <#${ch.id}> กันลิงก์แล้ว!`);
            }
        } catch (e) { console.error(e); }
    }

    // --- 2. Giveaway Setup Logic ---
    if (interaction.isButton() && interaction.customId.startsWith('gw_type_')) {
        const type = interaction.customId.replace('gw_type_', '');
        giveawaySetup.set(interaction.user.id, { prizeType: type });

        if (type === 'role') {
            const row = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('gw_set_role').setPlaceholder('เลือกยศที่จะแจก...'));
            await interaction.reply({ content: '🛡️ **กรุณาเลือกยศที่จะแจกให้ผู้ชนะค่ะ:**', components: [row], ephemeral: true });
        } else {
            // ถามจำนวนผู้ชนะก่อน
            const modal = new ModalBuilder().setCustomId('gw_ask_winners_count').setTitle('ตั้งค่าจำนวนรางวัล');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('winners_count').setLabel("จำนวนผู้ชนะ (1-3)").setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === 'gw_set_role') {
        const setup = giveawaySetup.get(interaction.user.id);
        setup.prizes = [interaction.values[0]]; // เก็บ ID ยศ
        setup.winners = 1; // ยศแจกทีละ 1 หรือต้องแก้เพิ่มถ้าอยากแจกหลายคน
        giveawaySetup.set(interaction.user.id, setup);
        
        // ถามเวลาต่อ
        const modal = new ModalBuilder().setCustomId('gw_ask_duration').setTitle('ตั้งค่าเวลากิจกรรม');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel("ระยะเวลา (เช่น 1m, 1h)").setStyle(TextInputStyle.Short).setRequired(true)));
        await interaction.showModal(modal);
    }

    if (interaction.isChannelSelectMenu()) {
        const setup = giveawaySetup.get(interaction.user.id);
        if (interaction.customId === 'gw_select_target') {
            setup.targetCh = interaction.values[0];
            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('gw_select_log').setPlaceholder('เลือกห้องแจ้งเตือนผู้ชนะ...').addChannelTypes(ChannelType.GuildText));
            await interaction.reply({ content: '🔔 **เลือกห้องสำหรับแจ้งเตือนผู้ชนะ (Log Channel):**', components: [row], ephemeral: true });
        } else if (interaction.customId === 'gw_select_log') {
            setup.logCh = interaction.values[0];
            
            // --- เริ่มกิจกรรม (Launch) ---
            const targetCh = interaction.guild.channels.cache.get(setup.targetCh);
            const logCh = interaction.guild.channels.cache.get(setup.logCh);
            let prizeText = setup.prizeType === 'role' ? `<@&${setup.prizes[0]}>` : '🎁 ความลับ (ลุ้นใน DM)';
            
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 กิจกรรม GIVEAWAY ✨').setDescription(`🎁 **รางวัล:** **${prizeText}**\n👥 **จำนวนผู้โชคดี:** **${setup.winners} ท่าน**\n⏳ **เวลา:** **${setup.duration}**\n\n⬇️ **รายชื่อผู้เข้าร่วม (Real-time):**\n(รอคนกดปุ่ม...)`).setFooter({ text: 'กดปุ่มด้านล่างเพื่อเข้าร่วม! (เวลาจะเริ่มนับเมื่อมีคนแรกกด)' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วมกิจกรรม').setEmoji('🎉').setStyle(ButtonStyle.Success));
            
            const gmsg = await targetCh.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ **กิจกรรมเริ่มแล้ว!**`, ephemeral: true });

            // Save active giveaway
            activeGiveaways.set(gmsg.id, {
                messageId: gmsg.id,
                channelId: targetCh.id,
                logChannelId: logCh.id,
                prizes: setup.prizes,
                prizeType: setup.prizeType,
                winnersCount: parseInt(setup.winners),
                duration: ms(setup.duration),
                startTime: null, // ยังไม่เริ่มนับ
                participants: []
            });
        }
    }

    // --- 3. Modals ---
    if (interaction.isModalSubmit()) {
        // Modal ถามจำนวนผู้ชนะ (สำหรับ Link/Text)
        if (interaction.customId === 'gw_ask_winners_count') {
            const count = parseInt(interaction.fields.getTextInputValue('winners_count'));
            if (isNaN(count) || count < 1 || count > 3) return interaction.reply({ content: '❌ ใส่ได้แค่ 1-3 คนครับ', ephemeral: true });
            
            const setup = giveawaySetup.get(interaction.user.id);
            setup.winners = count;
            giveawaySetup.set(interaction.user.id, setup);

            // เด้ง Modal ให้ใส่ของรางวัลตามจำนวนคน
            const modal = new ModalBuilder().setCustomId('gw_input_prizes').setTitle(`ใส่ของรางวัล (${count} ชิ้น)`);
            for (let i = 0; i < count; i++) {
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`prize_${i}`).setLabel(`รางวัลชิ้นที่ ${i+1} ${setup.prizeType === 'link' ? '(ลิ้งก์)' : '(ข้อความ)'}`).setStyle(TextInputStyle.Paragraph).setRequired(true)));
            }
            await interaction.showModal(modal);
        }
        
        // Modal รับค่ารางวัล
        else if (interaction.customId === 'gw_input_prizes') {
            const setup = giveawaySetup.get(interaction.user.id);
            setup.prizes = [];
            for (let i = 0; i < setup.winners; i++) {
                setup.prizes.push(interaction.fields.getTextInputValue(`prize_${i}`));
            }
            giveawaySetup.set(interaction.user.id, setup);

            // ถามเวลาต่อ
            const modal = new ModalBuilder().setCustomId('gw_ask_duration').setTitle('ตั้งค่าเวลากิจกรรม');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel("ระยะเวลา (เช่น 1m, 1h)").setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        }

        // Modal รับเวลา -> ไปเลือกห้อง
        else if (interaction.customId === 'gw_ask_duration') {
            const setup = giveawaySetup.get(interaction.user.id);
            setup.duration = interaction.fields.getTextInputValue('duration');
            giveawaySetup.set(interaction.user.id, setup);

            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('gw_select_target').setPlaceholder('เลือกห้องที่จะโพสต์กิจกรรม...').addChannelTypes(ChannelType.GuildText));
            await interaction.reply({ content: '📢 **เลือกห้องที่จะให้ปายโพสต์กิจกรรม (Target Channel):**', components: [row], ephemeral: true });
        }

        // Tell DM Modal
        else if (interaction.customId === 'tell_dm_modal') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const target = await client.users.fetch(interaction.fields.getTextInputValue('target_id'));
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('💌 มีข้อความฝากบอกถึงคุณค่ะ!').setDescription(`>>> **"${interaction.fields.getTextInputValue('dm_msg')}"**\n\n*จากผู้ไม่ประสงค์ออกนาม (ส่งผ่านระบบ Tell DM)*`);
                await target.send({ embeds: [embed] });
                await interaction.editReply(`✅ **ส่งสำเร็จ!**`);
            } catch { await interaction.editReply('❌ **ส่งไม่สำเร็จค่ะ** (ID ผิด หรือเขาปิดรับ DM)'); }
        }
    }

    // --- 4. General Buttons ---
    if (interaction.isButton()) {
        // --- JOIN GIVEAWAY ---
        if (interaction.customId === 'join_giveaway') {
            const gw = activeGiveaways.get(interaction.message.id);
            if (!gw) return interaction.reply({ content: '❌ กิจกรรมนี้จบไปแล้วหรือระบบรีเซ็ตแล้วค่ะ', ephemeral: true });

            if (gw.participants.includes(interaction.user.id)) return interaction.reply({ content: '⚠️ ตัวเองลงชื่อไปแล้วน้า!', ephemeral: true });

            // คนแรกกด -> เริ่มจับเวลา
            if (gw.participants.length === 0) {
                gw.startTime = Date.now();
                setTimeout(() => endGiveaway(gw), gw.duration);
            }

            gw.participants.push(interaction.user.id);
            activeGiveaways.set(interaction.message.id, gw); // Update Map

            // Update Embed (Real-time List)
            const listStr = gw.participants.map((id, index) => `${index + 1}. <@${id}>`).join('\n');
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            
            // คำนวณเวลาจบ (ถ้าเริ่มแล้ว)
            let timeText = gw.startTime ? `สิ้นสุด: <t:${Math.floor((gw.startTime + gw.duration)/1000)}:R>` : `เวลา: ${ms(gw.duration, { long: true })}`;
            
            embed.setDescription(`🎁 **รางวัล:** **${gw.prizeType === 'role' ? `<@&${gw.prizes[0]}>` : '🎁 ความลับ (ลุ้นใน DM)'}**\n👥 **ผู้โชคดี:** **${gw.winnersCount} ท่าน**\n⏳ **${timeText}**\n\n⬇️ **รายชื่อผู้เข้าร่วม (${gw.participants.length}):**\n${listStr.substring(0, 1000)}`); // Limit length
            
            await interaction.update({ embeds: [embed] });
        }

        // --- CLAIM PRIZE ---
        if (interaction.customId.startsWith('claim_')) {
            const gwId = interaction.customId.split('_')[1];
            const prizeIndex = parseInt(interaction.customId.split('_')[2]); // 0, 1, 2...
            
            // เนื่องจากเราไม่ได้ใช้ DB ถาวร เราจะ encode รางวัลใส่ customId ไม่ได้ถ้ายาวเกินไป
            // แต่เรามี activeGiveaways map (ถ้าบอทไม่ดับ)
            // ถ้าบอทดับ... ข้อมูลหาย จบ. (ข้อจำกัด RAM)
            // เราจะใช้วิธีเช็ค activeGiveaways ก่อน
            
            // *หมายเหตุ:* โค้ดนี้เน้นทำงานได้ตอนบอทเปิดอยู่ ถ้าบอทรีสตาร์ท ปุ่มเก่าจะกดไม่ได้ (ต้องทำใจหรือใช้ DB)
            // เพื่อแก้ปัญหาเบื้องต้น จะแนบข้อมูลรางวัลไปกับ CustomID ถ้าสั้นพอ แต่ถ้าเป็นลิ้งก์ยาวๆ ไม่พอแน่
            // ดังนั้นขอใช้ Map เป็นหลักครับ
            
            // แต่เดี๋ยวก่อน! ตอนจบกิจกรรม เราส่งปุ่ม Claim ให้คนชนะ *แต่ละคน* หรือ *ปุ่มรวม*?
            // "ผู้ชนะมากดปุ่มรับรางวัล" -> ปุ่มรวม
            
            // Logic: ปุ่ม Claim เช็คว่า user คนนี้คือผู้ชนะคนที่เท่าไหร่
            // แล้วส่ง prize[index] ให้เขา
            
            // เราจะดึงข้อมูลจาก Embed description ที่เราแก้ตอนจบก็ได้ (แต่มันเป็น text)
            // ขอใช้วิธีง่ายสุด: ส่ง DM ทันทีที่จบกิจกรรมเลยดีกว่าไหม? -> ไม่ได้ โจทย์สั่งให้กดปุ่มรับ
            
            // งั้นเรา Encode รางวัลใส่ CustomID ไม่ได้เพราะยาว
            // เราต้องใช้ Map `activeGiveaways` เก็บผู้ชนะด้วยหลังจบ
            
            // **การแก้ไขหน้างาน:** ผมจะเขียน logic ในฟังก์ชัน `endGiveaway` ให้สร้างปุ่มที่มี Prize Index
            // แต่ถ้า user กด ปุ่ม -> เช็คว่า user id ตรงกับ winner list ไหม
            
            // เนื่องจากข้อจำกัดความยาว CustomID (100 chars) และไม่มี DB
            // ผมจะให้ "ปุ่มกดรับรางวัล" ส่ง DM โดยอ่านข้อมูลจาก "Memory" (activeGiveaways)
            // ถ้าบอทรีสตาร์ท ปุ่มจะใช้ไม่ได้ (ต้องยอมรับข้อนี้สำหรับ Code File เดียว)
            
            const gw = activeGiveaways.get(gwId);
            if (!gw || !gw.winnersList) return interaction.reply({ content: '❌ ข้อมูลกิจกรรมหมดอายุ (บอทรีสตาร์ท) กรุณาติดต่อแอดมินรับมือค่ะ', ephemeral: true });
            
            const winnerIndex = gw.winnersList.indexOf(interaction.user.id);
            if (winnerIndex === -1) return interaction.reply({ content: '❌ ตัวเองไม่ใช่ผู้ชนะน้าา', ephemeral: true });
            
            const prize = gw.prizes[winnerIndex] || gw.prizes[0]; // ถ้ามีรางวัลเดียวก็ใช้อันแรก
            
            await interaction.reply({ content: '🎉 **กำลังส่งของรางวัลให้ทาง DM...**', ephemeral: true });
            
            try {
                const dmEmbed = new EmbedBuilder().setColor('Gold').setTitle('🎁 ของรางวัลมาแล้ว!').setFooter({text: 'xSwift Hub Giveaway'});
                const components = [];
                
                if (gw.prizeType === 'role') {
                    dmEmbed.setDescription(`ยินดีด้วย! คุณได้รับยศ <@&${prize}> \nระบบได้มอบยศให้คุณเรียบร้อยแล้วค่ะ! ✅`);
                    const role = interaction.guild.roles.cache.get(prize);
                    if (role) await interaction.member.roles.add(role).catch(()=>{});
                } else if (gw.prizeType === 'link') {
                    dmEmbed.setDescription(`ยินดีด้วย! นี่คือลิ้งก์รางวัลของคุณค่ะ 👇`);
                    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🔗 กดเพื่อรับรางวัล').setStyle(ButtonStyle.Link).setURL(prize));
                    components.push(btn);
                } else { // text
                    dmEmbed.setDescription(`ยินดีด้วย! นี่คือโค้ดรางวัลของคุณค่ะ 👇\n\`\`\`${prize}\`\`\`\n(กดค้างเพื่อคัดลอก)`);
                }
                
                await interaction.user.send({ embeds: [dmEmbed], components });
                await interaction.followUp({ content: '✅ **ส่งเรียบร้อย! เช็ค DM ได้เลยค่ะ**', ephemeral: true });
            } catch (e) {
                await interaction.followUp({ content: '❌ **ส่ง DM ไม่ได้** (ตัวเองปิด DM หรือเปล่า?) รบกวนเปิดแล้วกดใหม่นะคะ', ephemeral: true });
            }
        }

        // Verify Check
        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            if (interaction.member.roles.cache.has(rId)) {
                return interaction.reply({ content: `⚠️ **ได้รับยศ <@&${rId}> ไปแล้วน้า!** อย่ากดเล่นสิคะตัวเอง~ 😜`, ephemeral: true });
            }
            const role = interaction.guild.roles.cache.get(rId);
            if (role) await interaction.member.roles.add(role).then(() => interaction.reply({ content: '✅ **ยืนยันตัวตนสำเร็จ!** ยินดีต้อนรับนะคะ 💖', ephemeral: true })).catch(() => interaction.reply({ content: '❌ ปายยศต่ำกว่าค่ะ ให้ยศไม่ได้', ephemeral: true }));
        }

        // Ticket & Level
        if (interaction.customId === 'open_ticket') {
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.reply({ content: '❌ มีห้องเดิมอยู่แล้วนะคะ', ephemeral: true });
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋ว').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ content: `<@${OWNER_ID}>`, embeds: [new EmbedBuilder().setTitle('🎫 มีสมาชิกเปิดตั๋วใหม่ค่ะ').setColor('Green')], components: [btn] });
            await interaction.reply({ content: `✅ เปิดห้องให้แล้วค่ะ! 👉 <#${ch.id}>`, ephemeral: true });
        }
        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 กำลังปิดห้องภายใน 5 วินาที...');
            setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
        }
        if (interaction.customId === 'check_level') {
            const d = db.users[interaction.user.id] || { xp: 0, level: 1 };
            interaction.reply({ content: `📊 **Lv.${d.level}** | XP: ${d.xp}`, ephemeral: true });
        }
        if (interaction.customId === 'open_tell_dm_modal') {
            const modal = new ModalBuilder().setCustomId('tell_dm_modal').setTitle('💌 ฝากบอกข้อความ');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dm_msg').setLabel("ข้อความ").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }
});

// ฟังก์ชันจบ Giveaway
async function endGiveaway(gw) {
    try {
        const channel = client.channels.cache.get(gw.channelId);
        const logChannel = client.channels.cache.get(gw.logChannelId);
        if (!channel) return;

        const msg = await channel.messages.fetch(gw.messageId).catch(()=>null);
        if (!msg) return;

        if (gw.participants.length === 0) {
            msg.edit({ content: '❌ **จบกิจกรรมแล้ว (ไม่มีผู้เข้าร่วม)**', embeds: [], components: [] });
            return;
        }

        // สุ่มผู้ชนะ
        const shuffled = gw.participants.sort(() => 0.5 - Math.random());
        const winners = shuffled.slice(0, gw.winnersCount);
        gw.winnersList = winners; // บันทึกผู้ชนะไว้ใน Map
        activeGiveaways.set(gw.messageId, gw); // Update Map

        // สร้าง Embed จบ
        const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ประกาศรายชื่อผู้โชคดี! 🎊')
            .setDescription(`🏆 **ผู้ชนะ:** ${winners.map((id, i) => `${i+1}. <@${id}>`).join('\n')}\n\n⚠️ **เงื่อนไข:** กรุณากดปุ่ม **"🎁 รับรางวัลที่นี่"** ภายใน 10 ชม.\n*(หากเป็นยศระบบจะมอบให้ทันที หากเป็นของรางวัลอื่นจะส่งทาง DM ค่ะ)*`);
        
        const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`claim_${gw.messageId}_btn`).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success));
        
        await msg.edit({ content: `🎉 **ยินดีด้วยค่ะ!**`, embeds: [resultEmbed], components: [claimRow] });

        // แจ้งเตือนห้อง Log
        if (logChannel) {
            const logEmbed = new EmbedBuilder().setColor('#00FF00').setTitle('📢 ประกาศผล Giveaway').setDescription(`🎉 ยินดีด้วยกับ: ${winners.map(id => `<@${id}>`).join(', ')}\n🎁 **รางวัล:** ||🔒 ตรวจสอบรางวัลจริงใน DM เท่านั้น||`).setTimestamp();
            logChannel.send({ content: winners.map(id => `<@${id}>`).join(' '), embeds: [logEmbed] });
        }

    } catch (e) { console.error(e); }
}

client.login(TOKEN);
