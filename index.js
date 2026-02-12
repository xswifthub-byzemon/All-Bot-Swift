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
    ActivityType 
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
        // ❌ ลบ GuildVoiceStates ออกแล้ว
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command ---
const commands = [
    new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('สร้างหน้า Panel รับยศยืนยันตัวตน (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('เลือกยศที่จะแจกให้สมาชิก')
                .setRequired(true))
    // ❌ ลบคำสั่ง join-voice ออกแล้ว
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปายมารายงานตัวแล้วค่ะ! ล็อกอินในชื่อ: ${client.user.tag}`);
    
    // --- ✨ ระบบเปลี่ยนสถานะวนลูป ✨ ---
    const statusMessages = [
        "⚙️ Swift Hub Core | Active",
        "👑 Powered by Zemon Źx",
        "💖 น้องปายรักพี่ซีม่อนที่สุด~",
        "🚀 ระบบยืนยันตัวตน 24/7",
        "🛡️ Swift Hub Security",
        "✨ ยินดีต้อนรับสู่ xSwift Hub",
        // ❌ ลบข้อความสิงห้องเสียงออก
        "🤖 บอททำงานปกติ 100%",
        "💻 Zemon Dev is Coding...",
        "🌟 อย่าลืมกดรับยศกันนะค้าบ"
    ];

    let currentIndex = 0;

    const updateStatus = () => {
        const message = statusMessages[currentIndex];
        client.user.setPresence({
            activities: [{ 
                name: message, 
                type: ActivityType.Playing 
            }],
            status: 'online', 
        });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    };

    updateStatus();
    setInterval(updateStatus, 2000); 

    try {
        console.log('🔄 กำลังลงทะเบียนคำสั่ง Slash Command...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('✨ ลงทะเบียนคำสั่งเรียบร้อยแล้วค่า!');
    } catch (error) {
        console.error(error);
    }
});

// --- 👂 รอรับคำสั่ง ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', ephemeral: true });
        }
    }

    // 1️⃣ คำสั่ง /setup-verify
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-verify') {
        const role = interaction.options.getRole('role');
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨')
            .setDescription(`ยินดีต้อนรับเข้าสู่ **${interaction.guild.name}** นะคะ! 🎉\n\nกรุณากดปุ่ม **"✅ รับยศเข้าดิส"** ด้านล่าง\nเพื่อรับยศ <@&${role.id}> และปลดล็อกห้องต่างๆ ค่ะ\n\n*ขอให้สนุกกับการพูดคุยนะคะ~ 💖*`)
            .setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif')
            .setFooter({ text: 'ระบบโดย น้องปาย (Swift Hub Core) ⚙️', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
        await interaction.reply({ content: '✅ ปายสร้างหน้า Panel ให้เรียบร้อยแล้วค่ะ!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // 2️⃣ ปุ่มกดรับยศ
    if (interaction.isButton() && interaction.customId.startsWith('verify_button_')) {
        const roleId = interaction.customId.split('_')[2];
        const role = interaction.guild.roles.cache.get(roleId);
        const member = interaction.member;
        if (!role) return interaction.reply({ content: '❌ ไม่พบยศนี้ค่ะ', ephemeral: true });
        if (member.roles.cache.has(roleId)) return interaction.reply({ content: '🌟 มีแล้วน้า!', ephemeral: true });
        try {
            await member.roles.add(role);
            await interaction.reply({ content: `✅ **ยืนยันตัวตนสำเร็จ!** ได้รับยศ **${role.name}** แล้วค่ะ 💖`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ ปายยศต่ำกว่าค่ะ เลื่อนยศปายขึ้นให้หน่อยน้า~', ephemeral: true });
        }
    }
});

client.login(TOKEN);
