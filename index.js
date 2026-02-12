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
    new SlashCommandBuilder().setName('setup-verify').setDescription('สร้างหน้า Panel รับยศ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('role').setDescription('เลือกยศ').setRequired(true)),
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋วติดต่อแอดมิน').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติสมาชิก').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('📢 ประกาศข่าวสาร').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหา').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูปประกอบ')),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความ (รวดเร็ว)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวน (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เริ่มกิจกรรมแจกรางวัล')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName('prize').setDescription('ของรางวัล (คีย์, ลิ้งก์ซองเงิน, หรือชื่อยศ)').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('เวลา (เช่น 1m, 1h)').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('จำนวนผู้ชนะ').setMinValue(1).setRequired(true))
        .addChannelOption(o => o.setName('log_channel').setDescription('ช่องที่จะแจ้งเตือนผู้ชนะ').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้อง').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-level').setDescription('📊 สร้างหน้า Panel ระบบเลเวล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addRoleOption(o => o.setName('lv20').setRequired(true)).addRoleOption(o => o.setName('lv40').setRequired(true)).addRoleOption(o => o.setName('lv60').setRequired(true)).addRoleOption(o => o.setName('lv80').setRequired(true)).addRoleOption(o => o.setName('lv100').setRequired(true))
].map(command => command.toJSON());

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
});

// ฟังก์ชัน XP 
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
        if (!db.users[message.author.id]) db.users[message.author.id] = { xp: 0, level: 1, lastMsg: 0 };
        db.users[message.author.id].lastMsg = Date.now();
        if (leveledUp) {
            message.channel.send(`🎊 ยินดีด้วยค่ะคุณ <@${message.author.id}>! เลเวลอัปเป็น **Lv.${db.users[message.author.id].level}** แล้วน้าา เก่งที่สุดเลย! 💖✨`).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000));
        }
    }
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

        if (interaction.commandName === 'clear') {
            const amt = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amt, true);
            return interaction.reply({ content: `🧹 กวาดถูแชทให้แล้วค่ะ **${amt}** ข้อความ! สะอาดเรียบร้อยในพริบตาเลย ✨`, ephemeral: true });
        }

        if (interaction.commandName !== 'giveaway') await interaction.deferReply({ ephemeral: true });

        if (interaction.commandName === 'setup-verify') {
            const role = interaction.options.getRole('role');
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨').setDescription(`ยินดีต้อนรับเพื่อนๆ ทุกคนเข้าสู่สังคมแห่งการแบ่งปันนะคะ! 🎉\n\n**ขั้นตอนการเข้าสู่เซิร์ฟเวอร์:**\n1️⃣ อ่านกฎระเบียบให้เรียบร้อย\n2️⃣ กดปุ่มสีเขียวเพื่อยืนยันตัวตน\n3️⃣ รับยศ <@&${role.id}> เพื่อเปิดห้องพูดคุย\n\n*ขอให้สนุกนะคะ! 💖*`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบรับยศเรียบร้อยค่ะ!');
        }

        if (interaction.commandName === 'giveaway') {
            const prize = interaction.options.getString('prize');
            const dur = interaction.options.getString('duration');
            const wins = interaction.options.getInteger('winners');
            const logCh = interaction.options.getChannel('log_channel');

            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 กิจกรรม GIVEAWAY ✨').setDescription(`มาลุ้นรับรางวัลกันเถอะทุกคน! ✨\n\n🎁 **รางวัล:** **ปิดเป็นความลับ (ตรวจสอบใน DM)**\n👥 **จำนวนผู้โชคดี:** **${wins} ท่าน**\n⏳ **ระยะเวลา:** **${dur}**\n\n*กดปุ่มด้านล่างเพื่อลงชื่อลุ้นรางวัลได้เลยน้า 💖*`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วมกิจกรรม').setEmoji('🎁').setStyle(ButtonStyle.Primary));
            const gmsg = await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ เริ่มกิจกรรมแจกของแล้วค่ะ!', ephemeral: true });

            let entry = [];
            const col = gmsg.createMessageComponentCollector({ time: ms(dur) });
            col.on('collect', i => {
                if (entry.includes(i.user.id)) return i.reply({ content: 'ตัวเองกดไปแล้วน้า! 🌟', ephemeral: true });
                entry.push(i.user.id);
                i.reply({ content: 'ลงชื่อสำเร็จ! ขอให้โชคดีน้า~ 💖', ephemeral: true });
            });

            col.on('end', async () => {
                if (entry.length === 0) return gmsg.edit({ content: '❌ ไม่มีคนร่วมเลยง่า...', embeds: [], components: [] });
                const winners = entry.sort(() => 0.5 - Math.random()).slice(0, wins);
                const expiry = Date.now() + (10 * 60 * 60 * 1000);

                const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ประกาศรายชื่อผู้โชคดี! 🎊').setDescription(`ยินดีด้วยกับผู้ที่ได้รับรางวัลนะคะ!\n🏆 **ผู้ชนะ:** ${winners.map(w => `<@${w}>`).join(', ')}\n\n⚠️ **เงื่อนไข:** กรุณากดรับรางวัลภายใน 10 ชม. มิฉะนั้นจะเป็นโมฆะค่ะ!\n*(รางวัลถูกส่งเข้า DM เพื่อกันคนขโมยน้า)*`);
                const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`claim_${expiry}_${prize}`).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success));
                await gmsg.edit({ content: `🎊 จบกิจกรรมแล้วค่ะ! 🎉`, embeds: [resultEmbed], components: [claimRow] });

                // แจ้งเตือนห้อง Log (🔒 ปิดรางวัลถาวรในช่องแชท)
                const logEmbed = new EmbedBuilder().setColor('#00FF00').setTitle('📢 ประกาศผู้ชนะกิจกรรม!').setDescription(`🎉 ยินดีด้วยกับ ${winners.map(w => `<@${w}>`).join(', ')}\nที่ได้รับรางวัล: ||🔒 ตรวจสอบรางวัลจริงใน DM ของคุณเท่านั้น|| ✨\n\n📌 **ผู้ชนะกรุณากดรับรางวัลด้านบนเพื่อรับข้อมูลใน DM นะคะ!**`).setTimestamp();
                await logCh.send({ content: winners.map(w => `<@${w}>`).join(' '), embeds: [logEmbed] });
            });
        }
        
        if (interaction.commandName === 'setup-antilink') {
            const ch = interaction.options.getChannel('channel');
            if (!db.config.antiLink.includes(ch.id)) db.config.antiLink.push(ch.id);
            await interaction.editReply(`🛡️ ห้อง <#${ch.id}> กันลิงก์เรียบร้อย!`);
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('claim_')) {
            const parts = interaction.customId.split('_');
            const expiry = parseInt(parts[1]);
            const prize = parts.slice(2).join('_');
            const isLink = prize.includes('http');

            if (Date.now() > expiry) return interaction.reply({ content: `❌ **หมดเวลารับรางวัลแล้วค่ะ!** เสียใจด้วยน้า รางวัลเป็นโมฆะแล้วค่ะ 🥺`, ephemeral: true });
            if (!interaction.message.embeds[0].description.includes(interaction.user.id)) return interaction.reply({ content: `❌ อุ๊ย! รางวัลนี้ไม่ใช่ของตัวเองน้าา 🤭`, ephemeral: true });

            await interaction.reply({ content: `🎉 **ยินดีด้วยค่ะ!** ปายจัดการส่งรายละเอียดรางวัลไปให้ทาง **DM** แล้วนะคะ ตรวจสอบและใช้งานได้ทันทีเลยค่ะ! 💖\n*(ใน DM จะเห็นรางวัลชัดเจนและกดลิ้งก์ได้น้า)*`, ephemeral: true });
            
            try {
                const dmEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 รางวัล GIVEAWAY ของคุณมาส่งแล้ว! 🎊')
                    .setDescription(`ยินดีด้วยนะคะ! รางวัลที่คุณได้รับคือ:\n\n${isLink ? `🔗 **ลิ้งก์รางวัล:** (จิ้มที่ปุ่มด้านล่างเพื่อเปิดลิ้งก์ได้เลยค่ะ)` : `🎁 **ของรางวัล:** \`${prize}\` (จิ้มคัดลอกได้ทันที!)`}\n\n*ขอบคุณที่ร่วมกิจกรรมกับ xSwift Hub นะคะ รักน้าา~ 💖*`);
                
                const dmRow = new ActionRowBuilder();
                if (isLink) {
                    dmRow.addComponents(new ButtonBuilder().setLabel('🔗 คลิกเปิดลิ้งก์รางวัล').setStyle(ButtonStyle.Link).setURL(prize));
                }

                await interaction.user.send({ embeds: [dmEmbed], components: isLink ? [dmRow] : [] });

                const roleObj = interaction.guild.roles.cache.find(r => r.name === prize || r.id === prize.replace(/[<@&>]/g, ''));
                if (roleObj) await interaction.member.roles.add(roleObj).catch(()=>{});
            } catch (e) { console.log('ผู้ชนะปิด DM'); }
        }

        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            if (interaction.member.roles.cache.has(rId)) return interaction.reply({ content: '❌ **อุ๊ย! ตัวเองมียศนี้อยู่แล้วน้าา** เก็บความตื่นเต้นไว้คุยกับเพื่อนๆ ดีกว่าน้า 💖✨', ephemeral: true });
            const role = interaction.guild.roles.cache.get(rId);
            if (role) {
                await interaction.member.roles.add(role).then(() => interaction.reply({ content: '✅ **ยินยันตัวตนสำเร็จ!** ยินดีต้อนรับนะคะ 💖', ephemeral: true })).catch(() => interaction.reply({ content: '❌ ปายยศต่ำกว่าค่ะ', ephemeral: true }));
            }
        }
        
        if (interaction.customId === 'open_ticket') {
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.reply({ content: '❌ มีห้องเดิมอยู่แล้วนะคะ!', ephemeral: true });
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const emb = new EmbedBuilder().setColor('#00FF00').setTitle(`🎫 ศูนย์แจ้งปัญหา: ${interaction.user.tag}`).setDescription(`แอดมิน <@${OWNER_ID}> จะรีบมาตรวจสอบให้เร็วที่สุดค่ะ! 🛡️`).setTimestamp();
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋วติดต่อ').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ embeds: [emb], components: [btn] });
            await interaction.reply({ content: `✅ เปิดห้องให้แล้วค่ะ! 👉 <#${ch.id}>`, ephemeral: true });
        }
        
        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 กำลังปิดห้องภายใน 5 วินาทีค่ะ...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(TOKEN);
