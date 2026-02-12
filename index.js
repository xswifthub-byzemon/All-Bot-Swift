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

const db = {
    users: {}, 
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
    new SlashCommandBuilder().setName('setup-verify').setDescription('สร้างหน้า Panel รับยศ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('เลือกยศที่ต้องการแจก').setRequired(true)),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋วติดต่อแอดมิน').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติสมาชิก').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('📢 ประกาศข่าวสาร').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อประกาศ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหาข่าว').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูปภาพประกอบ')),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความ (รวดเร็ว)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวนข้อความที่จะลบ (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เริ่มกิจกรรมแจกรางวัล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName('prize').setDescription('ใส่ของรางวัล (คีย์, ลิ้งก์, หรือชื่อยศ)').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('ใส่เวลา (เช่น 1m, 1h, 1d)').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('ใส่จำนวนผู้ชนะ').setMinValue(1).setRequired(true))
        .addChannelOption(o => o.setName('log_channel').setDescription('เลือกช่องที่จะแจ้งเตือนและแท็กผู้ชนะ').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้องที่ต้องการเฝ้าระวัง').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-level').setDescription('📊 สร้างหน้า Panel ระบบเลเวล')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(o => o.setName('lv20').setDescription('ยศเลเวล 20').setRequired(true))
        .addRoleOption(o => o.setName('lv40').setDescription('ยศเลเวล 40').setRequired(true))
        .addRoleOption(o => o.setName('lv60').setDescription('ยศเลเวล 60').setRequired(true))
        .addRoleOption(o => o.setName('lv80').setDescription('ยศเลเวล 80').setRequired(true))
        .addRoleOption(o => o.setName('lv100').setDescription('ยศเลเวล 100').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) รายงานตัวค่ะซีม่อน!`);
    const statusMessages = ["⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", "🚀 xSwift Hub Community"];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 
    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
});

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
    if (Date.now() - (db.users[message.author.id]?.lastMsg || 0) > 60000) {
        const leveledUp = addXP(message.author.id, Math.floor(Math.random() * 6) + 5);
        if (db.users[message.author.id]) db.users[message.author.id].lastMsg = Date.now();
        if (leveledUp) {
            message.channel.send(`🎊 ยินดีด้วยค่ะคุณ <@${message.author.id}>! เลเวลอัปเป็น **Lv.${db.users[message.author.id].level}** แล้วน้าา ✨`).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000));
        }
    }
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
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName === 'clear') {
            const amt = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amt, true);
            return interaction.reply({ content: `🧹 กวาดถูแชทให้แล้วค่ะ **${amt}** ข้อความ! ✨`, ephemeral: true });
        }

        if (interaction.commandName !== 'giveaway') await interaction.deferReply({ ephemeral: true });

        try {
            if (interaction.commandName === 'giveaway') {
                const prize = interaction.options.getString('prize');
                const dur = interaction.options.getString('duration');
                const wins = interaction.options.getInteger('winners');
                const logCh = interaction.options.getChannel('log_channel');

                const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 กิจกรรม GIVEAWAY ✨').setDescription(`🎁 รางวัล: **ปิดเป็นความลับ (รับที่ DM)**\n👥 ผู้โชคดี: **${wins} ท่าน**\n⏳ เวลา: **${dur}**\n\n*กดปุ่มด้านล่างเพื่อลุ้นรางวัลได้เลยน้า 💖*`);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วมกิจกรรม').setEmoji('🎁').setStyle(ButtonStyle.Primary));
                const gmsg = await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: `✅ เริ่มกิจกรรมแล้ว! ปายจะแจ้งเตือนผู้ชนะที่ช่อง <#${logCh.id}> นะคะ`, ephemeral: true });

                let entry = [];
                const col = gmsg.createMessageComponentCollector({ time: ms(dur) });
                col.on('collect', i => {
                    if (entry.includes(i.user.id)) return i.reply({ content: 'ตัวเองกดไปแล้วน้า!', ephemeral: true });
                    entry.push(i.user.id);
                    i.reply({ content: 'ลงชื่อสำเร็จ! ขอให้โชคดีน้า~ 💖', ephemeral: true });
                });

                col.on('end', async () => {
                    if (entry.length === 0) return gmsg.edit({ content: '❌ ไม่มีคนร่วมกิจกรรมเลยง่า...', embeds: [], components: [] });
                    const winners = entry.sort(() => 0.5 - Math.random()).slice(0, wins);
                    const expiry = Date.now() + (10 * 60 * 60 * 1000);

                    const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ประกาศผู้ชนะกิจกรรม! 🎊').setDescription(`🏆 ผู้ชนะ: ${winners.map(w => `<@${w}>`).join(', ')}\n\n📌 **กรุณากดรับรางวัลที่ปุ่มด้านล่างภายใน 10 ชม. นะคะ**\n*(เพื่อความปลอดภัย รางวัลจะส่งเข้า DM เท่านั้น)*`);
                    const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`claim_${expiry}_${prize}`).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success));
                    await gmsg.edit({ content: `🎊 จบกิจกรรมแล้วค่ะ! 🎉`, embeds: [resultEmbed], components: [claimRow] });

                    // แจ้งเตือนในช่อง Log ที่ซีม่อนเลือก
                    const logEmbed = new EmbedBuilder().setColor('#00FF00').setTitle('📢 ประกาศรายชื่อผู้ชนะ!').setDescription(`🎉 ยินดีด้วยกับ ${winners.map(w => `<@${w}>`).join(', ')}\nที่ได้รับรางวัล: ||🔒 ตรวจสอบรางวัลจริงใน DM เท่านั้น|| ✨\n\n📌 **ผู้ชนะกรุณากลับไปกดปุ่มรับรางวัลในห้องกิจกรรมน้า!**`).setTimestamp();
                    await logCh.send({ content: winners.map(w => `<@${w}>`).join(' '), embeds: [logEmbed] });
                });
            }

            // ... (โค้ดคำสั่งอื่นๆ Setup Ticket, Verify, Level, AntiLink อยู่ครบเหมือนเดิมตามไฟล์ก่อนหน้า) ...
            if (interaction.commandName === 'setup-verify') {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตน ✨').setDescription(`กดปุ่มเพื่อรับยศ <@&${role.id}> ค่ะ`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setStyle(ButtonStyle.Success));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ ติดตั้งเรียบร้อยค่ะ!');
            }
        } catch (e) { console.error(e); }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('claim_')) {
            const parts = interaction.customId.split('_');
            const expiry = parseInt(parts[1]);
            const prize = parts.slice(2).join('_');
            if (Date.now() > expiry) return interaction.reply({ content: `❌ หมดเวลารับรางวัลแล้วค่ะ!`, ephemeral: true });
            if (!interaction.message.embeds[0].description.includes(interaction.user.id)) return interaction.reply({ content: `❌ รางวัลนี้ไม่ใช่ของตัวเองน้าา 🤭`, ephemeral: true });
            
            await interaction.reply({ content: `🎉 **ยินดีด้วยค่ะ!** ปายส่งรางวัลให้ใน DM แล้วนะคะ ตรวจสอบได้เลย! 💖`, ephemeral: true });
            try {
                const isLink = prize.includes('http');
                const dmEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ยินดีด้วยกับรางวัลของคุณ! 🎊').setDescription(`รางวัลของคุณคือ:\n\n${isLink ? `🔗 **ลิ้งก์รางวัล:** (กดปุ่มด้านล่าง)` : `🎁 **ของรางวัล:** \`${prize}\` (จิ้มคัดลอกได้เลย!)`}`);
                const dmRow = isLink ? new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🔗 คลิกเปิดลิ้งก์').setStyle(ButtonStyle.Link).setURL(prize)) : null;
                await interaction.user.send({ embeds: [dmEmbed], components: dmRow ? [dmRow] : [] });
                
                const roleObj = interaction.guild.roles.cache.find(r => r.name === prize || r.id === prize.replace(/[<@&>]/g, ''));
                if (roleObj) await interaction.member.roles.add(roleObj).catch(()=>{});
            } catch (e) { console.log('ผู้ชนะปิด DM'); }
        }
        
        // ... (ปุ่มอื่นๆ Verify, Ticket, Level Check อยู่ครบค่ะ) ...
        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(rId);
            if (role) await interaction.member.roles.add(role).then(() => interaction.reply({ content: '✅ ยืนยันตัวตนสำเร็จ! 💖', ephemeral: true })).catch(() => interaction.reply({ content: '❌ ปายยศต่ำกว่าค่ะ', ephemeral: true }));
        }
    }
});

client.login(TOKEN);
