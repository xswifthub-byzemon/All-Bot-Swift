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
    ChannelType // ✅ เพิ่มตัวนี้มาเพื่อเช็คห้องเสียง
} = require('discord.js');

const { joinVoiceChannel } = require('@discordjs/voice'); // ✅ เรียกใช้ระบบเสียง

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates // ✅ สำคัญ! ต้องเปิดการรับรู้เรื่องเสียง
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// --- 📝 ลงทะเบียนคำสั่ง Slash Command (รวม 2 คำสั่ง) ---
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
    
    // 2. คำสั่งให้บอทเข้าห้องเสียง (ใหม่! ✨)
    new SlashCommandBuilder()
        .setName('join-voice') // ชื่อคำสั่งที่ปายตั้งให้
        .setDescription('สั่งให้ปายเข้าสิงห้องเสียง 24/7 (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('เลือกห้องเสียงที่จะให้ปายเข้า')
                .addChannelTypes(ChannelType.GuildVoice) // บังคับเลือกได้แค่ห้องเสียง
                .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปายมารายงานตัวแล้วค่ะ! ล็อกอินในชื่อ: ${client.user.tag}`);
    
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
    
    // 🔒 เช็คว่าเป็นซีม่อนไหม (ใช้ได้กับทุกคำสั่งที่เป็น Slash Command)
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ **ไม่อนุญาตค่ะ!** คำสั่งนี้ให้ **ซีม่อน** ใช้ได้คนเดียวเท่านั้น! 😤', 
                ephemeral: true 
            });
        }
    }

    // 1️⃣ คำสั่ง /setup-verify (ระบบรับยศ)
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

    // 2️⃣ คำสั่ง /join-voice (ระบบเข้าห้องเสียง)
    if (interaction.isChatInputCommand() && interaction.commandName === 'join-voice') {
        const channel = interaction.options.getChannel('channel');

        try {
            // สั่งให้เชื่อมต่อ
            joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true, // ปิดหูตัวเอง (ประหยัดเน็ต)
                selfMute: false // ไม่ปิดไมค์ (เผื่ออนาคตซีม่อนอยากให้พูด)
            });

            await interaction.reply({ 
                content: `✅ **รับทราบค่ะซีม่อน!** ปายเข้าไปสิงในห้อง <#${channel.id}> เรียบร้อยแล้วค่ะ 🔊\n*ปายจะอยู่เฝ้าห้องนี้ยาวๆ จนกว่าโลกจะแตกเลยค่า~*`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ ปายเข้าห้องไม่ได้ง่า... ตรวจสอบสิทธิ์ห้องเสียงของปายหน่อยน้า~ 🥺', ephemeral: true });
        }
    }

    // 3️⃣ ระบบกดปุ่มรับยศ (เหมือนเดิม)
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
