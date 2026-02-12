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

let antiLinkChannels = []; 

// --- 🛡️ ระบบกันบอทตาย ---
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
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
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้อง').addChannelTypes(ChannelType.GuildText).setRequired(true))
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
});

// --- 🛡️ ระบบ Anti-Link ---
client.on('messageCreate', async message => {
    if (message.author.bot || !antiLinkChannels.includes(message.channelId)) return;
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content)) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send({ content: `❌ **ระวังค่ะคุณ <@${message.author.id}>!** ห้องนี้ห้ามส่งลิงก์ทุกรูปแบบนะคะ ปายขอลบออกเพื่อความปลอดภัยของเซิร์ฟเวอร์น้า~ 🛡️✨` });
        setTimeout(() => warn.delete().catch(() => {}), 10000); // 10 วินาทีหายไปเอง
    }
});

client.on('interactionCreate', async interaction => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName !== 'giveaway') await interaction.deferReply({ ephemeral: true });

        // 1️⃣ Setup Verify
        if (interaction.commandName === 'setup-verify') {
            const role = interaction.options.getRole('role');
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('✨ ยินดีต้อนรับสู่ครอบครัว xSwift Hub ✨')
                .setDescription(`ยินดีต้อนรับเพื่อนๆ ทุกคนเข้าสู่สังคมแห่งการแบ่งปันนะคะ! 🎉\n\n**ขั้นตอนการเข้าสู่เซิร์ฟเวอร์:**\n1️⃣ อ่านกฎระเบียบของเซิร์ฟเวอร์ให้เรียบร้อย\n2️⃣ กดปุ่มสีเขียวด้านล่างเพื่อยืนยันตัวตน\n3️⃣ รับยศ <@&${role.id}> เพื่อเปิดห้องพูดคุยทั้งหมด\n\n*ขอให้สนุกกับการสร้างมิตรภาพใหม่ๆ นะคะ! 💖*`)
                .setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif')
                .setFooter({ text: 'ระบบยืนยันตัวตนโดย น้องปาย ⚙️' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบรับยศเรียบร้อยค่ะ!');
        }

        // 2️⃣ Setup Ticket (Community Ver.)
        if (interaction.commandName === 'setup-ticket') {
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('📩 ศูนย์ช่วยเหลือสมาชิก xSwift Hub 🛡️')
                .setDescription(`สวัสดีค่ะ! หากเพื่อนๆ พบปัญหาหรือต้องการความช่วยเหลือ สามารถเปิดตั๋วได้ที่นี่เลยน้า\n\n**เรื่องที่สามารถติดต่อได้:**\n⚠️ แจ้งสมาชิกที่ทำผิดกฎ/นิสัยไม่ดี\n🛠️ แจ้งปัญหาการใช้งานในเซิร์ฟเวอร์\n💬 ติดต่อสอบถามแอดมินโดยตรง\n\n*ปายและแอดมินพร้อมดูแลทุกคนเสมอค่ะ! กดปุ่มด้านล่างได้เลย 👇*`)
                .setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg')
                .setFooter({ text: 'Swift Hub Core System 🛡️' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('แจ้งปัญหา / ติดต่อแอดมิน').setEmoji('📩').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบตั๋วเรียบร้อยค่ะ!');
        }

        // 3️⃣ Setup Tell DM
        if (interaction.commandName === 'setup-tell-dm') {
            const embed = new EmbedBuilder()
                .setColor('#A020F0')
                .setTitle('💌 บริการฝากบอกความในใจ (Tell DM) ✨')
                .setDescription(`อยากบอกอะไรกับเพื่อนแต่ไม่กล้าทักไปตรงๆ ไหมคะ? ให้ปายช่วยสิ!\n\n**กติกาการใช้บริการ:**\n📝 พิมพ์ข้อความที่ต้องการส่ง (ใส่ได้ยาวๆ เลยค่ะ)\n👤 ระบุ User ID ของผู้รับให้ถูกต้อง\n💖 ปายจะส่งข้อความไปหาเขาทาง DM ทันที!\n\n*มาสร้างความประทับใจดีๆ ให้กันนะคะ กดปุ่มด้านล่างเลย 👇*`)
                .setImage('https://i.pinimg.com/originals/c9/22/68/c92268d92cf2dbf96e3195683d9d3afc.gif');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_tell_dm_modal').setLabel('ส่งข้อความฝากบอก').setEmoji('💌').setStyle(ButtonStyle.Secondary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ สร้างระบบฝากบอกเรียบร้อยค่ะ!');
        }

        // 4️⃣ Giveaway (Advanced System)
        if (interaction.commandName === 'giveaway') {
            const prize = interaction.options.getString('prize');
            const dur = interaction.options.getString('duration');
            const wins = interaction.options.getInteger('winners');
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎊 กิจกรรม GIVEAWAY สุดพิเศษ! 🎊')
                .setDescription(`มาลุ้นรับรางวัลกันเถอะทุกคน! ✨\n\n🎁 **รางวัล:** **${prize}**\n👥 **จำนวนผู้โชคดี:** **${wins} ท่าน**\n⏳ **ระยะเวลา:** **${dur}**\n\n*กดปุ่มด้านล่างเพื่อลงชื่อลุ้นรางวัลได้เลยน้า ขอให้ทุกคนโชคดีนะคะ! 💖*`)
                .setFooter({ text: `สิ้นสุดกิจกรรมในอีก: ${dur}` });
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
                if (entry.length === 0) return gmsg.edit({ content: '❌ กิจกรรมจบลงแล้วแต่ไม่มีผู้เข้าร่วมเลยง่า... เสียใจจัง 🥺', embeds: [], components: [] });
                const winners = entry.sort(() => 0.5 - Math.random()).slice(0, wins);
                const expiryTime = Date.now() + (10 * 60 * 60 * 1000); // 10 ชั่วโมง

                const resultEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎊 ประกาศรายชื่อผู้โชคดี! 🎊')
                    .setDescription(`ยินดีด้วยกับผู้ที่ได้รับ **${prize}** นะคะ!\n\n🏆 **ผู้ชนะคือ:** ${winners.map(w => `<@${w}>`).join(', ')}\n\n⚠️ **เงื่อนไขสำคัญ:**\nกรุณากดปุ่ม **"🎁 รับรางวัลที่นี่"** ด้านล่างภายใน **10 ชั่วโมง** นะคะ\nหากไม่กดรับภายในเวลาที่กำหนด รางวัลจะถือว่าเป็น **"โมฆะ"** ทันทีค่ะ! ❌`)
                    .setFooter({ text: 'ขอแสดงความยินดีด้วยนะคะ! 💖' });

                const claimRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`claim_${prize}_${expiryTime}`).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success)
                );

                await gmsg.edit({ content: `🎊 ยินดีด้วยค่ะ! 🎉`, embeds: [resultEmbed], components: [claimRow] });
            });
        }
        
        // 5️⃣ Clear, Stats, Announce, AntiLink (เหมือนเดิมแต่ปรับปรุงข้อความ)
        if (interaction.commandName === 'setup-stats') {
            await interaction.guild.members.fetch();
            const total = interaction.guild.memberCount;
            const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
            const humans = total - bots;
            const cat = await interaction.guild.channels.create({ name: '📊 สถิติชาว xSwift Hub', type: ChannelType.GuildCategory });
            await interaction.guild.channels.create({ name: `👨・สมาชิก: ${humans}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.guild.channels.create({ name: `🌎・รวมทั้งหมด: ${total}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.guild.channels.create({ name: `🤖・บอท: ${bots}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.editReply('✅ สร้างห้องสถิติเรียบร้อยค่ะ!');
        }

        if (interaction.commandName === 'announce') {
            const title = interaction.options.getString('title');
            const msg = interaction.options.getString('message');
            const img = interaction.options.getAttachment('image');
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`📢 ${title}`).setDescription(msg).setTimestamp().setFooter({ text: `ประกาศโดย: ${interaction.user.username}` });
            if (img) embed.setImage(img.url);
            await interaction.channel.send({ content: '@everyone', embeds: [embed] });
            await interaction.editReply('✅ ส่งประกาศเรียบร้อยค่ะ!');
        }

        if (interaction.commandName === 'clear') {
            const amt = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amt, true);
            await interaction.editReply(`🧹 กวาดถูแชทให้แล้วค่ะ **${amt}** ข้อความ! ✨`);
        }

        if (interaction.commandName === 'setup-antilink') {
            const ch = interaction.options.getChannel('channel');
            if (!antiLinkChannels.includes(ch.id)) antiLinkChannels.push(ch.id);
            await interaction.editReply(`🛡️ ห้อง <#${ch.id}> จะถูกปายเฝ้าระวังลิงก์อย่างเข้มงวดค่ะ!`);
        }
    }

    // --- 🔘 ระบบจัดการปุ่มต่างๆ ---
    if (interaction.isButton()) {
        
        // รับรางวัล Giveaway 🎁
        if (interaction.customId.startsWith('claim_')) {
            const [ , prize, expiry] = interaction.customId.split('_');
            
            // เช็คว่าหมดเวลา 10 ชม. หรือยัง
            if (Date.now() > parseInt(expiry)) {
                return interaction.reply({ content: `❌ **หมดเวลารับรางวัลแล้วค่ะ!** รางวัลนี้เป็นโมฆะตามที่ระบุไว้ในประกาศนะคะ เสียใจด้วยน้า 🥺`, ephemeral: true });
            }

            // เช็คว่าเป็นผู้ชนะหรือไม่ (จากข้อความประกาศ)
            if (!interaction.message.embeds[0].description.includes(interaction.user.id)) {
                return interaction.reply({ content: `❌ อุ๊ย! รางวัลนี้ไม่ใช่ของตัวเองน้า ให้ผู้ชนะตัวจริงเขามากดรับนะคะ 🤭`, ephemeral: true });
            }

            const successMsg = `🎉 **ยินดีด้วยค่ะคุณ <@${interaction.user.id}>!** มารับรางวัล **"${prize}"** ไปครองได้เลยน้า\n\n🎁 **ช่องทางการรับรางวัล:**\nปายส่งข้อมูลไปให้ทาง **DM** แล้วนะคะ ตรวจสอบได้เลยค่ะ! (ถ้าเป็นลิ้งก์ สามารถจิ้มที่ข้อความใน DM ได้เลยน้า)`;
            
            await interaction.reply({ content: successMsg, ephemeral: true });
            
            // ส่ง DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎊 รางวัล GIVEAWAY มาส่งแล้วค่า! 🎊')
                    .setDescription(`ยินดีด้วยน้าตัวเอง! นี่คือรางวัล **"${prize}"** ของคุณค่ะ\n\n📌 **รายละเอียด:** [คลิกจิ้มที่นี่เพื่อดูหรือรับรางวัล](${prize.includes('http') ? prize : 'https://discord.com'})\n\nขอบคุณที่ร่วมกิจกรรมกับเรานะคะ รักน้า~ 💖`)
                    .setFooter({ text: 'Swift Hub Core System' });
                await interaction.user.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.log('ส่ง DM ไม่ได้เพราะเขาปิดไว้');
            }

            // หายไปใน 10 วิ (จำลองโดยการ delete msg ถ้าทำได้ แต่ reply ephemeral ลบไม่ได้)
        }

        // ปุ่มอื่นๆ (Verify, Ticket, Tell DM)
        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(rId);
            if (role) {
                await interaction.member.roles.add(role).then(() => interaction.reply({ content: '✅ **ยินยันตัวตนสำเร็จ!** ยินดีต้อนรับเข้าสู่ครอบครัวของเราอย่างเป็นทางการนะคะ 💖', ephemeral: true })).catch(() => interaction.reply({ content: '❌ ปายให้ยศไม่ได้ง่า ยศปายอยู่ต่ำกว่ายศนี้นะคะ', ephemeral: true }));
            }
        }

        if (interaction.customId === 'open_ticket') {
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.reply({ content: '❌ ตัวเองมีห้องตั๋วอยู่แล้วนะคะ ทักในห้องเดิมได้เลย!', ephemeral: true });
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const emb = new EmbedBuilder().setColor('#00FF00').setTitle(`🎫 ศูนย์แจ้งปัญหา: ${interaction.user.tag}`).setDescription(`สวัสดีค่ะ! พิมพ์แจ้งปัญหาที่พบหรือระบุชื่อคนที่ทำผิดกฎไว้ได้เลยนะคะ แอดมิน <@${OWNER_ID}> จะรีบมาตรวจสอบให้เร็วที่สุดค่ะ! 🛡️`).setTimestamp();
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋วติดต่อ').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ content: `<@${OWNER_ID}> มีสมาชิกแจ้งปัญหามาค่ะ! 🔔`, embeds: [emb], components: [btn] });
            await interaction.reply({ content: `✅ เปิดห้องติดต่อแอดมินให้แล้วค่ะ! 👉 <#${ch.id}>`, ephemeral: true });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 **รับทราบค่ะ!** กำลังดำเนินการปิดห้องตั๋วภายใน 5 วินาทีนะคะ...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        if (interaction.customId === 'open_tell_dm_modal') {
            const modal = new ModalBuilder().setCustomId('tell_dm_modal').setTitle('💌 ฝากบอกข้อความทาง DM');
            const idIn = new TextInputBuilder().setCustomId('target_id').setLabel("User ID ของคนที่จะรับข้อความ").setPlaceholder("ก๊อป ID มาวางตรงนี้เลยน้า").setStyle(TextInputStyle.Short).setRequired(true);
            const msgIn = new TextInputBuilder().setCustomId('dm_msg').setLabel("ข้อความความในใจ").setPlaceholder("พิมพ์สิ่งที่คุณอยากบอกเขา...").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(idIn), new ActionRowBuilder().addComponents(msgIn));
            await interaction.showModal(modal);
        }
    }

    // Modal Submit Tell DM
    if (interaction.isModalSubmit() && interaction.customId === 'tell_dm_modal') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const target = await client.users.fetch(interaction.fields.getTextInputValue('target_id'));
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('💌 มีข้อความฝากบอกถึงคุณค่ะ!').setDescription(`สวัสดีค่ะ! มีคนฝากปายมาบอกคุณว่า:\n\n>>> **"${interaction.fields.getTextInputValue('dm_msg')}"**\n\n*ขอให้วันนี้เป็นวันที่ดีของคุณนะคะ! 💖*`).setTimestamp().setFooter({ text: 'ส่งผ่านระบบ Swift Hub Core ⚙️' });
            await target.send({ embeds: [embed] });
            await interaction.editReply(`✅ **ส่งสำเร็จ!** ปายแอบไปบอกเขาให้เรียบร้อยแล้วนะคะ จุ๊ๆ~ 🤫💖`);
        } catch { await interaction.editReply('❌ **ว้า... ส่งไม่สำเร็จค่ะ**\n1. ID อาจจะผิด\n2. เขาปิดรับ DM จากคนนอกค่ะ 🥺'); }
    }
});

client.login(TOKEN);
