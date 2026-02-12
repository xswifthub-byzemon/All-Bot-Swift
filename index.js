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

// ฐานข้อมูลจำลอง (แนะนำว่าถ้าบอทรีสตาร์ทข้อมูลจะหาย ควรใช้ Database จริงในอนาคตนะคะ)
const db = {
    users: {}, // { userId: { xp: 0, level: 1, lastMsg: 0 } }
    config: { antiLink: [] }
};

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
    new SlashCommandBuilder().setName('setup-verify').setDescription('สร้างหน้า Panel รับยศ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('เลือกยศ').setRequired(true)),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋วติดต่อแอดมิน').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติสมาชิก').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('📢 ประกาศข่าวสาร').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหา').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูปประกอบ')),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวน (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เริ่มกิจกรรมแจกรางวัล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('prize').setDescription('ของรางวัล').setRequired(true)).addStringOption(o => o.setName('duration').setDescription('เวลา (เช่น 1m, 1h)').setRequired(true)).addIntegerOption(o => o.setName('winners').setDescription('จำนวนผู้ชนะ').setMinValue(1).setRequired(true)),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้อง').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    
    // ✨ คำสั่งใหม่: Setup ระบบเลเวล
    new SlashCommandBuilder()
        .setName('setup-level')
        .setDescription('📊 สร้างหน้า Panel อธิบายระบบเลเวล (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(o => o.setName('lv20').setDescription('ยศเลเวล 20').setRequired(true))
        .addRoleOption(o => o.setName('lv40').setDescription('ยศเลเวล 40').setRequired(true))
        .addRoleOption(o => o.setName('lv60').setDescription('ยศเลเวล 60').setRequired(true))
        .addRoleOption(o => o.setName('lv80').setDescription('ยศเลเวล 80').setRequired(true))
        .addRoleOption(o => o.setName('lv100').setDescription('ยศเลเวล 100').setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) รายงานตัวแล้วค่ะ!`);
    const statusMessages = ["⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", "🚀 xSwift Hub Community"];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 

    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }

    // ระบบ Voice XP: ตรวจสอบคนในห้องเสียงทุก 5 นาที
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            guild.voiceStates.cache.forEach(vs => {
                if (vs.member.user.bot || vs.mute || vs.deaf) return;
                addXP(vs.member.id, 10, guild); // แจก XP เล็กน้อย
            });
        });
    }, 300000);
});

// ฟังก์ชันคำนวณและเพิ่ม XP
function addXP(userId, amount, guild) {
    if (!db.users[userId]) db.users[userId] = { xp: 0, level: 1, lastMsg: 0 };
    db.users[userId].xp += amount;
    
    let nextLevelXP = db.users[userId].level * 500; // สูตรคำนวณให้เวลขึ้นยาก
    if (db.users[userId].xp >= nextLevelXP && db.users[userId].level < 100) {
        db.users[userId].level++;
        db.users[userId].xp = 0;
        return true; // Level Up!
    }
    return false;
}

// --- 🛡️ ระบบ Message Events (XP + AntiLink) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // 1. ระบบ XP
    if (Date.now() - (db.users[message.author.id]?.lastMsg || 0) > 60000) {
        const leveledUp = addXP(message.author.id, Math.floor(Math.random() * 6) + 5, message.guild);
        if (!db.users[message.author.id]) db.users[message.author.id] = { xp: 0, level: 1, lastMsg: 0 };
        db.users[message.author.id].lastMsg = Date.now();

        if (leveledUp) {
            message.channel.send(`🎊 ยินดีด้วยค่ะคุณ <@${message.author.id}>! เลเวลอัปเป็น **Lv.${db.users[message.author.id].level}** แล้วน้าา เก่งที่สุดเลย! 💖✨`).then(m => setTimeout(() => m.delete(), 10000));
        }
    }

    // 2. ระบบ Anti-Link
    if (db.config.antiLink.includes(message.channelId)) {
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        if (linkRegex.test(message.content)) {
            await message.delete().catch(() => {});
            const warn = await message.channel.send({ content: `❌ **ระวังค่ะคุณ <@${message.author.id}>!** ห้องนี้ห้ามส่งลิงก์ทุกรูปแบบนะคะ ปายขอลบออกเพื่อความปลอดภัยน้า~ 🛡️✨` });
            setTimeout(() => warn.delete().catch(() => {}), 10000); 
        }
    }
});

client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName !== 'giveaway') await interaction.deferReply({ ephemeral: true });

        // --- ระบบ Level Setup ---
        if (interaction.commandName === 'setup-level') {
            const roles = {
                20: interaction.options.getRole('lv20'),
                40: interaction.options.getRole('lv40'),
                60: interaction.options.getRole('lv60'),
                80: interaction.options.getRole('lv80'),
                100: interaction.options.getRole('lv100')
            };

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📊 ระบบเลเวลสังคมแห่งการแบ่งปัน xSwift Hub 🏆')
                .setDescription(`ยินดีต้อนรับเข้าสู่ระบบ Rank ของเราค่ะ! ยิ่งคุณมีส่วนร่วมมากเท่าไหร่ เลเวลก็จะยิ่งสูงขึ้นน้าา ✨\n\n**วิธีการสะสม XP (ขึ้นยากนิดนึงน้า):**\n💬 **พิมพ์พูดคุย:** ได้รับ XP ทุกนาทีที่พิมพ์\n🔊 **เข้าห้องเสียง:** ได้รับ XP ทุกๆ 5 นาทีที่สถิตอยู่\n🎁 **เข้าร่วมกิจกรรม:** รับแต้มพิเศษจากแอดมิน\n\n**รางวัลแห่งความพยายาม:**\n🎖️ **Lv.20:** <@&${roles[20].id}> - ความสามารถ: ปลดล็อกอิโมจิพิเศษ\n🥈 **Lv.40:** <@&${roles[40].id}> - ความสามารถ: พิมพ์ในห้องลับได้\n🥇 **Lv.60:** <@&${roles[60].id}> - ความสามารถ: สิทธิพิเศษในกิจกรรม Giveaway\n💎 **Lv.80:** <@&${roles[80].id}> - ความสามารถ: มีสิทธิ์เสนอไอเดียพัฒนาเซิร์ฟเวอร์\n👑 **Lv.100:** <@&${roles[100].id}> - **ระดับตำนาน!** ได้สิทธิ์ร่วมตัดสินใจทิศทางเซิร์ฟ\n\n*มาพยายามไปด้วยกันนะคะ ตันที่เลเวล 100 ค่ะ! 💖*`)
                .setImage('https://i.pinimg.com/originals/a0/0c/3b/a00c3b3186105a305d2f627d35398246.gif')
                .setFooter({ text: 'เช็คเลเวลของตัวเองได้ที่ปุ่มด้านล่างน้าา 👇' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('check_level').setLabel('📊 เช็คเลเวลของฉัน').setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ ติดตั้งระบบเลเวลเรียบร้อยค่ะ!');
        }

        // --- ระบบเดิมอื่นๆ (ห้ามลบ) ---
        if (interaction.commandName === 'setup-verify') {
            const role = interaction.options.getRole('role');
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨').setDescription(`ยินดีต้อนรับเพื่อนๆ ทุกคนเข้าสู่สังคมแห่งการแบ่งปันนะคะ! 🎉\n\n**ขั้นตอนการเข้าสู่เซิร์ฟเวอร์:**\n1️⃣ อ่านกฎระเบียบของเซิร์ฟเวอร์ให้เรียบร้อย\n2️⃣ กดปุ่มสีเขียวด้านล่างเพื่อยืนยันตัวตน\n3️⃣ รับยศ <@&${role.id}> เพื่อเปิดห้องพูดคุยทั้งหมด\n\n*ขอให้สนุกกับการสร้างมิตรภาพใหม่ๆ นะคะ! 💖*`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบรับยศเรียบร้อยค่ะ!');
        }

        if (interaction.commandName === 'setup-ticket') {
            const embed = new EmbedBuilder().setColor('#00BFFF').setTitle('📩 ศูนย์ช่วยเหลือสมาชิก xSwift Hub 🛡️').setDescription(`สวัสดีค่ะ! หากเพื่อนๆ พบปัญหาหรือต้องการความช่วยเหลือ สามารถเปิดตั๋วได้ที่นี่เลยน้า\n\n**เรื่องที่สามารถติดต่อได้:**\n⚠️ แจ้งสมาชิกที่ทำผิดกฎ/นิสัยไม่ดี\n🛠️ แจ้งปัญหาการใช้งานในเซิร์ฟเวอร์\n💬 ติดต่อสอบถามแอดมินโดยตรง\n\n*ปายและแอดมินพร้อมดูแลทุกคนเสมอค่ะ! กดปุ่มด้านล่างได้เลย 👇*`).setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('แจ้งปัญหา / ติดต่อแอดมิน').setEmoji('📩').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบตั๋วเรียบร้อยค่ะ!');
        }

        if (interaction.commandName === 'giveaway') {
            const prize = interaction.options.getString('prize');
            const dur = interaction.options.getString('duration');
            const wins = interaction.options.getInteger('winners');
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 กิจกรรม GIVEAWAY สุดพิเศษ! 🎊').setDescription(`มาลุ้นรับรางวัลกันเถอะทุกคน! ✨\n\n🎁 **รางวัล:** **${prize}**\n👥 **จำนวนผู้โชคดี:** **${wins} ท่าน**\n⏳ **ระยะเวลา:** **${dur}**\n\n*กดปุ่มด้านล่างเพื่อลงชื่อลุ้นรางวัลได้เลยน้า ขอให้ทุกคนโชคดีนะคะ! 💖*`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วมกิจกรรม').setEmoji('🎁').setStyle(ButtonStyle.Primary));
            const gmsg = await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ เริ่มกิจกรรมแจกของแล้วค่ะ!', ephemeral: true });
            let entry = [];
            const col = gmsg.createMessageComponentCollector({ time: ms(dur) });
            col.on('collect', i => {
                if (entry.includes(i.user.id)) return i.reply({ content: 'ตัวเองกดไปแล้วน้า รอประกาศผลได้เลยค่ะ! 🌟', ephemeral: true });
                entry.push(i.user.id);
                i.reply({ content: 'ลงชื่อสำเร็จ! ปายลงชื่อให้เรียบร้อยแล้วนะคะ ขอให้โชคดีน้า~ 💖', ephemeral: true });
            });
            col.on('end', async () => {
                if (entry.length === 0) return gmsg.edit({ content: '❌ ไม่มีคนร่วมเลยง่า...', embeds: [], components: [] });
                const winners = entry.sort(() => 0.5 - Math.random()).slice(0, wins);
                const expiry = Date.now() + (10 * 60 * 60 * 1000);
                const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ประกาศรายชื่อผู้โชคดี! 🎊').setDescription(`ยินดีด้วยกับผู้ที่ได้รับ **${prize}** นะคะ!\n🏆 **ผู้ชนะ:** ${winners.map(w => `<@${w}>`).join(', ')}\n⚠️ กดรับรางวัลภายใน 10 ชม. นะคะ!`).setFooter({ text: 'ยินดีด้วยนะคะ! 💖' });
                const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`claim_${prize}_${expiry}`).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success));
                await gmsg.edit({ content: `🎊 ยินดีด้วยค่ะ! 🎉`, embeds: [resultEmbed], components: [claimRow] });
            });
        }
    }

    // --- 🔘 Interaction Handler (Buttons) ---
    if (interaction.isButton()) {
        
        // ปุ่มเช็คเลเวล ✨
        if (interaction.customId === 'check_level') {
            const userData = db.users[interaction.user.id] || { xp: 0, level: 1 };
            const nextXP = userData.level * 500;
            const embed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle(`📈 ข้อมูลเลเวลของคุณ ${interaction.user.username}`)
                .setDescription(`ปัจจุบันคุณอยู่ที่ **Lv.${userData.level}** ค่ะ! 🌟\n\n✨ **XP สะสม:** \`${userData.xp}\` / \`${nextXP}\` แต้ม\n📊 **ความก้าวหน้า:** \`${((userData.xp / nextXP) * 100).toFixed(1)}%\` กว่าจะถึงเลเวลถัดไป\n\n**วิธีหา XP เพิ่ม:**\n💬 พิมพ์คุยในห้องแชท (จำกัด 1 ครั้ง/นาที)\n🔊 ออนไลน์ในห้องเสียง (ยิ่งอยู่นานยิ่งได้เยอะ)\n🎁 ร่วมสนุกกิจกรรมในเซิร์ฟเวอร์\n\n*ข้อความนี้จะหายไปเองใน 15 วินาทีนะคะ สู้ๆ ค่ะ! 💖*`)
                .setFooter({ text: 'Swift Hub Core Level System ⚙️' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
        }

        // ปุ่มรับรางวัล (Giveaway)
        if (interaction.customId.startsWith('claim_')) {
            const [ , prize, expiry] = interaction.customId.split('_');
            if (Date.now() > parseInt(expiry)) return interaction.reply({ content: `❌ **หมดเวลาแล้วค่ะ!** รางวัลนี้เป็นโมฆะแล้วนะคะ 🥺`, ephemeral: true });
            if (!interaction.message.embeds[0].description.includes(interaction.user.id)) return interaction.reply({ content: `❌ อุ๊ย! รางวัลนี้ไม่ใช่ของตัวเองน้าา 🤭`, ephemeral: true });
            await interaction.reply({ content: `🎉 ยินดีด้วยค่ะ! ปายส่งรายละเอียดรางวัล **"${prize}"** ไปทาง DM แล้วน้าา!`, ephemeral: true });
            try { interaction.user.send({ content: `🎊 รางวัลของคุณคือ **"${prize}"** ค่ะ! ยินดีด้วยน้าา 💖` }); } catch (e) {}
        }

        // ปุ่มรับยศ (Verify)
        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            if (interaction.member.roles.cache.has(rId)) return interaction.reply({ content: '❌ **อุ๊ย! ตัวเองมียศนี้อยู่แล้วน้าา** จะกดรับซ้ำทำไมเอ่ย~ 💖✨', ephemeral: true });
            const role = interaction.guild.roles.cache.get(rId);
            if (role) {
                await interaction.member.roles.add(role).then(() => {
                    interaction.reply({ content: '✅ **ยืนยันตัวตนสำเร็จ!** ยินดีต้อนรับเข้าสู่ครอบครัวของเราอย่างเป็นทางการนะคะ 💖', ephemeral: true });
                }).catch(() => interaction.reply({ content: '❌ ปายให้ยศไม่ได้ง่า ยศปายอยู่ต่ำกว่ายศนี้นะคะ', ephemeral: true }));
            }
        }

        // ระบบตั๋ว (Ticket)
        if (interaction.customId === 'open_ticket') {
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.reply({ content: '❌ มีห้องเดิมอยู่แล้วนะคะ!', ephemeral: true });
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const emb = new EmbedBuilder().setColor('#00FF00').setTitle(`🎫 ศูนย์แจ้งปัญหา: ${interaction.user.tag}`).setDescription(`แอดมิน <@${OWNER_ID}> จะรีบมาตรวจสอบให้เร็วที่สุดค่ะ! 🛡️`).setTimestamp();
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋วติดต่อ').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ content: `<@${OWNER_ID}> มีสมาชิกแจ้งปัญหามาค่ะ! 🔔`, embeds: [emb], components: [btn] });
            await interaction.reply({ content: `✅ เปิดห้องให้แล้วค่ะ! 👉 <#${ch.id}>`, ephemeral: true });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 กำลังปิดห้องภายใน 5 วินาทีค่ะ...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(TOKEN);
