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
// ใส่ไว้เพื่อไม่ให้บอทดับเวลาเจอ Error 503 หรือเน็ตหลุด
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
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command ---
const commands = [
    new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('สร้างหน้า Panel รับยศยืนยันตัวตน')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName('role').setDescription('เลือกยศ').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('สร้างหน้า Panel เปิดตั๋วติดต่อ/ซื้อของ')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('setup-stats')
        .setDescription('สร้างห้องโชว์จำนวนสมาชิกเรียลไทม์')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            const statsChannel = guild.channels.cache.find(c => c.name.startsWith('👥 Members:'));
            if (statsChannel) {
                statsChannel.setName(`👥 Members: ${guild.memberCount.toLocaleString()}`).catch(console.error);
            }
        });
    }, 600000);

    try {
        console.log('🔄 กำลังลงทะเบียนคำสั่ง Slash Command...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✨ ลงทะเบียนคำสั่งเรียบร้อยแล้วค่า!');
    } catch (error) {
        console.error(error);
    }
});

// --- 👂 รอรับคำสั่ง (Interaction) ---
client.on('interactionCreate', async interaction => {
    
    // ตรวจสอบว่าเป็นคำสั่ง Slash หรือไม่
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', ephemeral: true });
        }

        // ✅ ใช้ deferReply เพื่อบอก Discord ว่า "รอแป๊บนึงนะ" (แก้ปัญหา Application did not respond)
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
                const channel = await interaction.guild.channels.create({
                    name: `👥 Members: ${interaction.guild.memberCount.toLocaleString()}`,
                    type: ChannelType.GuildVoice,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }
                    ]
                });
                await interaction.editReply({ content: `✅ สร้างห้องสถิติเรียบร้อยแล้วค่ะ! <#${channel.id}>` });
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
        
        // A. ปุ่มรับยศ
        if (interaction.customId.startsWith('verify_button_')) {
            await interaction.deferReply({ ephemeral: true }); // กัน Error 503
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            
            if (!role) return interaction.editReply({ content: '❌ ไม่พบยศนี้ค่ะ (อาจถูกลบไปแล้ว)' });
            if (interaction.member.roles.cache.has(roleId)) return interaction.editReply({ content: '🌟 ตัวเองมียศนี้อยู่แล้วนะคะ!' });

            try {
                await interaction.member.roles.add(role);
                await interaction.editReply({ content: `✅ ได้รับยศ **${role.name}** เรียบร้อยค่ะ! 🎉` });
            } catch (error) {
                await interaction.editReply({ content: '❌ ปายให้ยศไม่ได้ค่ะ (ยศของปายต้องอยู่สูงกว่ายศที่จะแจกนะค้าบ)' });
            }
        }

        // B. ปุ่มเปิดตั๋ว
        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });
            
            // กันชื่อซ้ำ
            const cleanName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20); 
            const channelName = `ticket-${cleanName}`;
            const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
            
            if (existingChannel) {
                return interaction.editReply({ content: `❌ ตัวเองเปิดตั๋วค้างไว้อยู่นะคะ! ไปที่นี่เลย 👉 <#${existingChannel.id}>` });
            }

            try {
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`🎫 Ticket: ${interaction.user.tag}`)
                    .setDescription(`สวัสดีค่ะ <@${interaction.user.id}>! 👋\n\nซีม่อนจะรีบมาตอบกลับให้เร็วที่สุดนะคะ 💖\nแจ้งรายละเอียดไว้ได้เลยค่า\n\n*กดปุ่มสีแดงเพื่อปิดห้องเมื่อเสร็จธุระนะคะ*`)
                    .setTimestamp();
                
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋ว (Close)').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${OWNER_ID}> ลูกค้ามาแล้วค้าบ! 🔔`, embeds: [ticketEmbed], components: [closeRow] });
                await interaction.editReply({ content: `✅ เปิดห้องตั๋วแล้วค่ะ! ไปที่นี่เลย 👉 <#${ticketChannel.id}>` });

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ สร้างห้องไม่ได้ง่า... บอทอาจจะไม่มีสิทธิ์ Manage Channels หรือยศไม่ถึงค่ะ' });
            }
        }

        // C. ปุ่มปิดตั๋ว
        if (interaction.customId === 'close_ticket') {
            if (!interaction.channel.name.includes('ticket-')) return interaction.reply({ content: '❌ ใช้ได้เฉพาะในห้อง Ticket ค่ะ', ephemeral: true });
            
            await interaction.reply({ content: '🔒 กำลังลบห้องใน 5 วินาทีค่ะ...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
});

client.login(TOKEN);
