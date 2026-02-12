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
    ChannelType
} = require('discord.js');

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

// --- 🛡️ ระบบกันบอทตาย (Anti-Crash) ---
process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // ✅ เพิ่มเพื่อการจัดการข้อความ
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command ---
const commands = [
    // 1. ระบบรับยศ
    new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('สร้างหน้า Panel รับยศยืนยันตัวตน')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName('role').setDescription('เลือกยศ').setRequired(true)),
    
    // 2. ระบบตั๋ว
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('สร้างหน้า Panel เปิดตั๋วติดต่อ/ซื้อของ')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // 3. ระบบสถิติ
    new SlashCommandBuilder()
        .setName('setup-stats')
        .setDescription('สร้างหมวดหมู่และห้องโชว์จำนวนสมาชิก')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // 4. ระบบประกาศข่าว (ใหม่! ✨)
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('📢 ประกาศข่าวสารสวยๆ (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('title').setDescription('หัวข้อประกาศ').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('เนื้อหาข่าว').setRequired(true))
        .addAttachmentOption(option => option.setName('image').setDescription('รูปภาพประกอบ (ถ้ามี)')),

    // 5. ระบบล้างแชท (ใหม่! ✨)
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🧹 ลบข้อความในห้องนี้ (สูงสุด 100 ข้อความ)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('จำนวนข้อความที่จะลบ (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) มารายงานตัวแล้วค่ะ! Logged in as ${client.user.tag}`);
    
    // Custom Status
    const statusMessages = [
        "⚙️ Swift Hub Core | Active",
        "👑 Powered by Zemon Źx",
        "💖 น้องปายรักพี่ซีม่อนที่สุด~",
        "🚀 ระบบยืนยันตัวตน & ตั๋ว 24/7",
        "🛡️ Swift Hub Security",
        "✨ ยินดีต้อนรับสู่ xSwift Hub",
        "📩 ต้องการความช่วยเหลือ? เปิดตั๋วได้เลย!",
        "🤖 บอททำงานปกติ 100%",
        "💻 Zemon Dev is Coding...",
        "🌟 อย่าลืมกดรับยศกันนะค้าบ"
    ];

    let currentIndex = 0;
    const updateStatus = () => {
        const message = statusMessages[currentIndex];
        client.user.setPresence({
            activities: [{ name: message, type: ActivityType.Playing }],
            status: 'online', 
        });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    };
    setInterval(updateStatus, 3000); 

    // Server Stats Update (Every 10 mins)
    setInterval(async () => {
        client.guilds.cache.forEach(async guild => {
            try {
                await guild.members.fetch(); 
                const total = guild.memberCount;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const humans = total - bots;

                const humanChannel = guild.channels.cache.find(c => c.name.startsWith('Mw 👨・Members:'));
                const botChannel = guild.channels.cache.find(c => c.name.startsWith('Bot 🤖・Bots:'));
                const totalChannel = guild.channels.cache.find(c => c.name.startsWith('All 🌎・Total:'));

                if (humanChannel) humanChannel.setName(`Mw 👨・Members: ${humans.toLocaleString()}`).catch(console.error);
                if (botChannel) botChannel.setName(`Bot 🤖・Bots: ${bots.toLocaleString()}`).catch(console.error);
                if (totalChannel) totalChannel.setName(`All 🌎・Total: ${total.toLocaleString()}`).catch(console.error);
            } catch (err) { console.error(err); }
        });
    }, 600000);

    try {
        console.log('🔄 กำลังลงทะเบียนคำสั่ง Slash Command...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✨ ลงทะเบียนคำสั่งเรียบร้อยแล้วค่า!');
    } catch (error) { console.error(error); }
});

// --- 👂 รอรับคำสั่ง (Interaction) ---
client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // -----------------------------------------------------
            // 1️⃣ คำสั่ง /setup-verify
            // -----------------------------------------------------
            if (interaction.commandName === 'setup-verify') {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨')
                    .setDescription(`ยินดีต้อนรับเข้าสู่ **${interaction.guild.name}** นะคะ! 🎉\n\nกรุณากดปุ่ม **"✅ รับยศเข้าดิส"** ด้านล่าง\nเพื่อรับยศ <@&${role.id}> และปลดล็อกห้องต่างๆ ค่ะ\n\n*ขอให้สนุกกับการพูดคุยนะคะ~ 💖*`)
                    .setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif')
                    .setFooter({ text: 'ระบบโดย น้องปาย (Swift Hub Core) ⚙️', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success)
                );
                
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply({ content: '✅ สร้าง Panel รับยศเรียบร้อยค่ะ!' });
            }

            // -----------------------------------------------------
            // 2️⃣ คำสั่ง /setup-ticket
            // -----------------------------------------------------
            if (interaction.commandName === 'setup-ticket') {
                const embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('📩 ติดต่อสอบถาม / สั่งซื้อสินค้า 🛒')
                    .setDescription(`สวัสดีค่ะ! ยินดีต้อนรับสู่ **Swift Hub Support** ⚙️\n\nหากต้องการ:\n• 🛒 **สั่งซื้อสคริปต์ / ไอดีเกม**\n• 🛠️ **แจ้งปัญหาการใช้งาน**\n• 💬 **พูดคุยกับแอดมิน (ซีม่อน)**\n\n🔽 **กรุณากดปุ่มด้านล่างเพื่อเปิดห้องส่วนตัวค่ะ** 🔽`)
                    .setImage('https://i.imgur.com/7J9kXjD.gif')
                    .setFooter({ text: 'Swift Hub Core System 🛡️', iconURL: client.user.displayAvatarURL() });
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('open_ticket').setLabel('เปิดตั๋วติดต่อ (Open Ticket)').setEmoji('📩').setStyle(ButtonStyle.Primary)
                );
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply({ content: '✅ สร้าง Panel ตั๋วเรียบร้อยค่ะ!' });
            }

            // -----------------------------------------------------
            // 3️⃣ คำสั่ง /setup-stats
            // -----------------------------------------------------
            if (interaction.commandName === 'setup-stats') {
                await interaction.guild.members.fetch();
                const total = interaction.guild.memberCount;
                const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
                const humans = total - bots;

                const category = await interaction.guild.channels.create({
                    name: '📊 SERVER STATS',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }]
                });

                await interaction.guild.channels.create({ name: `Mw 👨・Members: ${humans.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.guild.channels.create({ name: `All 🌎・Total: ${total.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.guild.channels.create({ name: `Bot 🤖・Bots: ${bots.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });

                await interaction.editReply({ content: `✅ สร้างห้องสถิติเรียบร้อยแล้วค่ะ! 🎉` });
            }

            // -----------------------------------------------------
            // 4️⃣ คำสั่ง /announce (ประกาศข่าว) ✨ ใหม่!
            // -----------------------------------------------------
            if (interaction.commandName === 'announce') {
                const title = interaction.options.getString('title');
                const message = interaction.options.getString('message');
                const image = interaction.options.getAttachment('image');

                const announceEmbed = new EmbedBuilder()
                    .setColor('#FFD700') // สีทองสวยๆ
                    .setTitle(`📢 ${title}`)
                    .setDescription(message)
                    .setTimestamp()
                    .setFooter({ text: `ประกาศโดย: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                if (image) {
                    announceEmbed.setImage(image.url);
                }

                await interaction.channel.send({ content: '@everyone', embeds: [announceEmbed] });
                await interaction.editReply({ content: '✅ ส่งประกาศเรียบร้อยแล้วค่ะ!' });
            }

            // -----------------------------------------------------
            // 5️⃣ คำสั่ง /clear (ล้างแชท) ✨ ใหม่!
            // -----------------------------------------------------
            if (interaction.commandName === 'clear') {
                const amount = interaction.options.getInteger('amount');

                // ลบข้อความ (bulkDelete รับค่าสูงสุด 100)
                await interaction.channel.bulkDelete(amount, true).catch(err => {
                    console.error(err);
                    return interaction.editReply({ content: '❌ ลบไม่ได้อ่า... ข้อความเก่าเกิน 14 วันลบไม่ได้นะคะ Discord ห้ามไว้' });
                });

                await interaction.editReply({ content: `🧹 ปายกวาดขยะให้แล้ว **${amount}** ข้อความค่ะ!` });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ เกิดข้อผิดพลาด: ${error.message}` });
        }
    }

    // =====================================================
    // 🔘 ส่วนจัดการปุ่ม (Button Handler)
    // =====================================================

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('verify_button_')) {
            await interaction.deferReply({ ephemeral: true }); 
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.editReply({ content: '❌ ไม่พบยศนี้ค่ะ' });
            if (interaction.member.roles.cache.has(roleId)) return interaction.editReply({ content: '🌟 มีแล้วน้า!' });
            try {
                await interaction.member.roles.add(role);
                await interaction.editReply({ content: `✅ ได้รับยศ **${role.name}** เรียบร้อยค่ะ!` });
            } catch (error) {
                await interaction.editReply({ content: '❌ ยศของปายต้องอยู่สูงกว่ายศที่จะแจกนะค้าบ' });
            }
        }

        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });
            const cleanName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20); 
            const channelName = `ticket-${cleanName}`;
            const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
            if (existingChannel) return interaction.editReply({ content: `❌ เปิดตั๋วค้างไว้อยู่นะคะ! 👉 <#${existingChannel.id}>` });

            try {
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName, type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                const ticketEmbed = new EmbedBuilder()
                    .setColor('#00FF00').setTitle(`🎫 Ticket: ${interaction.user.tag}`)
                    .setDescription(`สวัสดีค่ะ <@${interaction.user.id}>! 👋\nซีม่อนจะรีบมาตอบกลับให้เร็วที่สุดนะคะ 💖\n\n*กดปุ่มสีแดงเพื่อปิดห้องเมื่อเสร็จธุระนะคะ*`)
                    .setTimestamp();
                const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋ว (Close)').setEmoji('🔒').setStyle(ButtonStyle.Danger));
                await ticketChannel.send({ content: `<@${OWNER_ID}> ลูกค้ามาแล้วค้าบ! 🔔`, embeds: [ticketEmbed], components: [closeRow] });
                await interaction.editReply({ content: `✅ เปิดห้องตั๋วแล้วค่ะ! 👉 <#${ticketChannel.id}>` });
            } catch (error) { console.error(error); await interaction.editReply({ content: '❌ สร้างห้องไม่ได้ (ตรวจสอบสิทธิ์ Manage Channels)' }); }
        }

        if (interaction.customId === 'close_ticket') {
            if (!interaction.channel.name.includes('ticket-')) return interaction.reply({ content: '❌ ใช้ได้เฉพาะในห้อง Ticket ค่ะ', ephemeral: true });
            await interaction.reply({ content: '🔒 กำลังลบห้องใน 5 วินาทีค่ะ...' });
            setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
        }
    }
});

client.login(TOKEN);
