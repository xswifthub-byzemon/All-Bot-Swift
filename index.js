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
    Routes 
} = require('discord.js');

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน (แก้ตรงนี้ หรือใส่ใน Railway Variables) ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; // ✅ เพิ่มตัวแปรนี้ค่ะ

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
        .setDescription('สร้างหน้า Panel รับยศยืนยันตัวตน (สำหรับซีม่อนเท่านั้น)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // กันคนอื่นเห็นคำสั่งเบื้องต้น
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('เลือกยศที่จะแจกให้สมาชิก')
                .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปายมารายงานตัวแล้วค่ะ! ล็อกอินในชื่อ: ${client.user.tag}`);
    console.log(`🔒 ระบบล็อคคำสั่งสำหรับ Owner ID: ${OWNER_ID} เรียบร้อย!`);
    
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

// --- 👂 รอรับคำสั่งและการกดปุ่ม ---
client.on('interactionCreate', async interaction => {
    
    // 1️⃣ กรณีใช้คำสั่ง /setup-verify
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup-verify') {
            
            // 🔒 เช็คไอดี: ถ้าคนสั่ง "ไม่ใช่" ซีม่อน (OWNER_ID) ให้ไล่กลับไปทันที!
            if (interaction.user.id !== OWNER_ID) {
                return interaction.reply({ 
                    content: '❌ **ขออภัยค่ะ!** คำสั่งนี้สงวนสิทธิ์ให้ **ซีม่อน (เจ้าของบอท)** ใช้ได้คนเดียวเท่านั้นค่ะ! 😤', 
                    ephemeral: true 
                });
            }

            const role = interaction.options.getRole('role');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨')
                .setDescription(`ยินดีต้อนรับเข้าสู่ **${interaction.guild.name}** นะคะ! 🎉\n\nกรุณากดปุ่ม **"✅ รับยศเข้าดิส"** ด้านล่าง\nเพื่อรับยศ <@&${role.id}> และปลดล็อกห้องต่างๆ ค่ะ\n\n*ขอให้สนุกกับการพูดคุยนะคะ~ 💖*`)
                .setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif')
                .setFooter({ text: 'ระบบโดย น้องปาย (Pai Bot) 💖', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_button_${role.id}`)
                        .setLabel('รับยศเข้าดิส')
                        .setEmoji('✅')
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.reply({ content: '✅ ปายสร้างหน้า Panel ให้เรียบร้อยแล้วค่ะซีม่อน!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }
    }

    // 2️⃣ กรณีคนกดปุ่ม (ส่วนนี้คนทั่วไปกดได้)
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('verify_button_')) {
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            const member = interaction.member;

            if (!role) {
                return interaction.reply({ content: '❌ หาไม่ยศเจอค่ะ ซีม่อนอาจจะลบยศนั้นไปแล้ว', ephemeral: true });
            }

            if (member.roles.cache.has(roleId)) {
                return interaction.reply({ content: '🌟 ตัวเองมียศนี้อยู่แล้วนะคะ!', ephemeral: true });
            }

            try {
                await member.roles.add(role);
                await interaction.reply({ content: `✅ **ยืนยันตัวตนสำเร็จ!** ได้รับยศ **${role.name}** แล้วค่ะ 💖`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ ปายให้ยศไม่ได้ง่า... ยศของปายต้องอยู่สูงกว่ายศที่จะแจกนะค้าบ ซีม่อนช่วยเลื่อนยศปายขึ้นไปหน่อยน้า~ 🥺', ephemeral: true });
            }
        }
    }
});

client.login(TOKEN);
