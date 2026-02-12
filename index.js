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
    ChannelType // ✅ เพิ่ม ChannelType เพื่อใช้สร้างห้องตั๋วและห้องสถิติ
} = require('discord.js');

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command (3 คำสั่ง) ---
const commands = [
    // 1. คำสั่งสร้างปุ่มรับยศ
    new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('สร้างหน้า Panel รับยศยืนยันตัวตน (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('เลือกยศที่จะแจกให้สมาชิก')
                .setRequired(true)),
    
    // 2. คำสั่งสร้างระบบตั๋ว (Ticket) ✨ ใหม่!
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('สร้างหน้า Panel เปิดตั๋วติดต่อ/ซื้อของ (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // 3. คำสั่งสร้างห้องนับคน (Stats) 📊 ใหม่!
    new SlashCommandBuilder()
        .setName('setup-stats')
        .setDescription('สร้างห้องโชว์จำนวนสมาชิกเรียลไทม์ (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปายมารายงานตัวแล้วค่ะ! ล็อกอินในชื่อ: ${client.user.tag}`);
    
    // --- ✨ ระบบ 1: Custom Status (สถานะวนลูป) ✨ ---
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
    setInterval(updateStatus, 3000); // เปลี่ยนทุก 3 วิ

    // --- ✨ ระบบ 2: Server Stats (อัปเดตยอดคน) ✨ ---
    // ปายจะคอยเช็คทุก 10 นาที (กันโดน Discord บล็อกเพราะแก้ชื่อบ่อยเกิน)
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            // หาห้องที่มีคำว่า "Members:" หรือ "สมาชิก:"
            const statsChannel = guild.channels.cache.find(c => 
                c.name.includes('Members:') || c.name.includes('สมาชิก:')
            );
            if (statsChannel) {
                // อัปเดตชื่อห้องเป็นจำนวนคนล่าสุด
                statsChannel.setName(`👥 Members: ${guild.memberCount.toLocaleString()}`);
            }
        });
    }, 600000); // 10 นาที (600,000 ms)

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
    
    // 🔒 เช็คสิทธิ์ซีม่อน (OWNER_ID) สำหรับคำสั่ง Slash
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', ephemeral: true });
        }
    }

    // -----------------------------------------------------
    // 1️⃣ คำสั่ง /setup-verify (ระบบรับยศ)
    // -----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-verify') {
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
        await interaction.reply({ content: '✅ สร้าง Panel รับยศเรียบร้อยค่ะ!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // -----------------------------------------------------
    // 2️⃣ คำสั่ง /setup-ticket (ระบบตั๋ว) ✨
    // -----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setColor('#00BFFF') // สีฟ้าสวยๆ
            .setTitle('📩 ติดต่อสอบถาม / สั่งซื้อสินค้า 🛒')
            .setDescription(`สวัสดีค่ะ! ยินดีต้อนรับสู่ **Swift Hub Support** ⚙️\n\nหากต้องการ:\n• 🛒 **สั่งซื้อสคริปต์ / ไอดีเกม**\n• 🛠️ **แจ้งปัญหาการใช้งาน**\n• 💬 **พูดคุยกับแอดมิน (ซีม่อน)**\n\n🔽 **กรุณากดปุ่มด้านล่างเพื่อเปิดห้องส่วนตัวค่ะ** 🔽`)
            .setImage('https://i.imgur.com/7J9kXjD.gif') // รูป GIF แนว Cyber/Support (เปลี่ยนได้)
            .setFooter({ text: 'Swift Hub Core System 🛡️', iconURL: client.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('เปิดตั๋วติดต่อ (Open Ticket)')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary) // ปุ่มสีน้ำเงิน
        );

        await interaction.reply({ content: '✅ สร้าง Panel ตั๋วเรียบร้อยค่ะ!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // -----------------------------------------------------
    // 3️⃣ คำสั่ง /setup-stats (ระบบนับคน) 📊
    // -----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-stats') {
        try {
            // สร้างห้องเสียงหลอกๆ ไว้โชว์เลข
            const channel = await interaction.guild.channels.create({
                name: `👥 Members: ${interaction.guild.memberCount.toLocaleString()}`,
                type: ChannelType.GuildVoice, // เป็นห้องเสียง (คนจะได้เข้าไม่ได้ง่ายๆ)
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.Connect], // ห้ามคนกดเข้าห้อง
                        allow: [PermissionFlagsBits.ViewChannel] // แต่ให้มองเห็นได้
                    }
                ]
            });
            await interaction.reply({ content: `✅ สร้างห้องสถิติเรียบร้อยแล้วค่ะ! <#${channel.id}>\n*(ปายจะอัปเดตตัวเลขให้ทุกๆ 10 นาทีนะคะ)*`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ สร้างห้องไม่ได้ง่า... บอทอาจจะไม่มีสิทธิ์ Manage Channels ค่ะ', ephemeral: true });
        }
    }

    // =====================================================
    // 🔘 ส่วนจัดการปุ่ม (Button Handler)
    // =====================================================

    // A. ปุ่มรับยศ (Verify)
    if (interaction.isButton() && interaction.customId.startsWith('verify_button_')) {
        const roleId = interaction.customId.split('_')[2];
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: '❌ ไม่พบยศนี้ค่ะ', ephemeral: true });
        if (interaction.member.roles.cache.has(roleId)) return interaction.reply({ content: '🌟 มีแล้วน้า!', ephemeral: true });
        try {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: `✅ ได้รับยศ **${role.name}** แล้วค่ะ!`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ ปายยศต่ำกว่าค่ะ เลื่อนยศปายขึ้นให้หน่อยน้า~', ephemeral: true });
        }
    }

    // B. ปุ่มเปิดตั๋ว (Open Ticket)
    if (interaction.isButton() && interaction.customId === 'open_ticket') {
        // เช็คว่าเคยเปิดตั๋วค้างไว้ไหม (หาห้องที่ชื่อ ticket-ชื่อคน)
        const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, ''); // ทำให้ชื่อห้องถูกต้อง
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
        
        if (existingChannel) {
            return interaction.reply({ content: `❌ ตัวเองมีห้องตั๋วอยู่แล้วนะคะ! เชิญทางนี้เลย 👉 <#${existingChannel.id}>`, ephemeral: true });
        }

        try {
            // สร้างห้องส่วนตัว
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: interaction.channel.parentId, // สร้างในหมวดหมู่เดียวกันกับที่กดปุ่ม (หรือระบุ ID หมวดหมู่ก็ได้)
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel] // คนอื่นห้ามเห็น
                    },
                    {
                        id: interaction.user.id, // คนกดปุ่ม
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] // เห็นและพิมพ์ได้
                    },
                    {
                        id: OWNER_ID, // ซีม่อน (เจ้าของ)
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] // เห็นและพิมพ์ได้
                    },
                    {
                        id: client.user.id, // ตัวบอทเอง
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            // ส่งข้อความต้อนรับในห้องใหม่
            const ticketEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(`🎫 Ticket: ${interaction.user.username}`)
                .setDescription(`สวัสดีค่ะ <@${interaction.user.id}>! 👋\n\nซีม่อนจะรีบมาตอบกลับให้เร็วที่สุดนะคะ 💖\nระหว่างนี้พิมพ์รายละเอียดที่ต้องการติดต่อไว้ได้เลยค่ะ\n\n*กดปุ่มสีแดงเพื่อปิดงานเมื่อคุยเสร็จแล้วนะคะ*`)
                .setTimestamp();
            
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋ว (Close)').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `<@${OWNER_ID}> มีลูกค้ามาค้าบ! 🔔`, embeds: [ticketEmbed], components: [closeRow] });
            await interaction.reply({ content: `✅ เปิดห้องตั๋วให้แล้วค่ะ! ไปที่นี่เลย 👉 <#${ticketChannel.id}>`, ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ สร้างห้องตั๋วไม่ได้ง่า... (เช็คสิทธิ์ Manage Channels ของปายหน่อยน้า)', ephemeral: true });
        }
    }

    // C. ปุ่มปิดตั๋ว (Close Ticket)
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        if (!interaction.channel.name.includes('ticket-')) {
            return interaction.reply({ content: '❌ ปุ่มนี้ใช้ได้เฉพาะในห้อง Ticket เท่านั้นค่ะ', ephemeral: true });
        }
        
        await interaction.reply({ content: '🔒 กำลังลบห้องใน 5 วินาทีค่ะ...' });
        setTimeout(() => {
            interaction.channel.delete().catch(console.error);
        }, 5000);
    }
});

client.login(TOKEN);
