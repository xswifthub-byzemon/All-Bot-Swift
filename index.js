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
    ChannelType,
    ActivityType // ✅ เพิ่มตัวนี้สำหรับตั้งสถานะ
} = require('discord.js');

const { joinVoiceChannel } = require('@discordjs/voice'); 

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates 
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
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('join-voice') 
        .setDescription('สั่งให้ปายเข้าสิงห้องเสียง 24/7 (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('เลือกห้องเสียงที่จะให้ปายเข้า')
                .addChannelTypes(ChannelType.GuildVoice) 
                .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปายมารายงานตัวแล้วค่ะ! ล็อกอินในชื่อ: ${client.user.tag}`);
    
    // --- ✨ ส่วนใหม่: ระบบเปลี่ยนสถานะวนลูป (Custom Status) ✨ ---
    const statusMessages = [
        { name: "⚙️ Swift Hub Core | Active", type: ActivityType.Watching },
        { name: "👑 Powered by Zemon Źx", type: ActivityType.Listening },
        { name: "💖 น้องปายรักพี่ซีม่อนที่สุด~", type: ActivityType.Playing },
        { name: "🚀 ระบบยืนยันตัวตน 24/7", type: ActivityType.Competing },
        { name: "🛡️ Swift Hub Security", type: ActivityType.Watching },
        { name: "✨ ยินดีต้อนรับสู่ xSwift Hub", type: ActivityType.Playing },
        { name: "🎧 สิงห้องเสียงอยู่กับซีม่อน", type: ActivityType.Listening },
        { name: "🤖 บอททำงานปกติ 100%", type: ActivityType.Watching },
        { name: "💻 Zemon Dev is Coding...", type: ActivityType.Playing },
        { name: "🌟 อย่าลืมกดรับยศกันนะค้าบ", type: ActivityType.Watching }
    ];

    let currentIndex = 0;

    // ตั้งเวลาเปลี่ยนทุกๆ 2 วินาที (2000 ms)
    setInterval(() => {
        const status = statusMessages[currentIndex];
        client.user.setActivity(status.name, { type: status.type });
        
        // วนลูป Index (ถ้าถึงตัวสุดท้ายให้กลับไปตัวแรก)
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 2000); 

    // -----------------------------------------------------------

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
            return interaction.reply({ 
                content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', 
                ephemeral: true 
            });
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

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_button_${role.id}`)
                    .setLabel('รับยศเข้าดิส')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ content: '✅ ปายสร้างหน้า Panel ให้เรียบร้อยแล้วค่ะ!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // 2️⃣ คำสั่ง /join-voice
    if (interaction.isChatInputCommand() && interaction.commandName === 'join-voice') {
        const channel = interaction.options.getChannel('channel');
        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true, 
                selfMute: false 
            });
            await interaction.reply({ 
                content: `✅ **รับทราบค่ะซีม่อน!** ปายเข้าไปสิงในห้อง <#${channel.id}> เรียบร้อยแล้วค่ะ 🔊`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ ปายเข้าห้องไม่ได้ง่า... ตรวจสอบสิทธิ์ห้องเสียงหน่อยน้า~ 🥺', ephemeral: true });
        }
    }

    // 3️⃣ ปุ่มกดรับยศ
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('verify_button_')) {
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            const member = interaction.member;

            if (!role) return interaction.reply({ content: '❌ ไม่พบยศนี้ค่ะ', ephemeral: true });
            if (member.roles.cache.has(roleId)) return interaction.reply({ content: '🌟 มีแล้วน้า!', ephemeral: true });

            try {
                await member.roles.add(role);
                await interaction.reply({ content: `✅ **ยืนยันตัวตนสำเร็จ!** ได้รับยศ **${role.name}** แล้วค่ะ 💖`, ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: '❌ ปายยศต่ำกว่ายศที่จะแจกค่ะซีม่อน ช่วยเลื่อนปายขึ้นไปหน่อย~ 🥺', ephemeral: true });
            }
        }
    }
});

client.login(TOKEN);
