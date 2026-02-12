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
    TextInputStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const ms = require('ms'); 

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

// ตัวแปรเก็บข้อมูลชั่วคราวขณะตั้งค่ากิจกรรม
const giveawaySetup = new Map(); 
const db = { users: {}, config: { antiLink: [] } };

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
    new SlashCommandBuilder().setName('clear').setDescription('🧹 ลบข้อความ (รวดเร็ว)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวนข้อความ (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName('setup-tell-dm').setDescription('💌 สร้างหน้า Panel ฝากบอก DM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-antilink').setDescription('🛡️ ตั้งค่าห้องห้ามส่งลิงก์').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(o => o.setName('channel').setDescription('เลือกห้องที่ต้องการเฝ้าระวัง').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('setup-level').setDescription('📊 สร้างหน้า Panel ระบบเลเวล').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(o => o.setName('lv20').setDescription('ยศ Lv.20').setRequired(true))
        .addRoleOption(o => o.setName('lv40').setDescription('ยศ Lv.40').setRequired(true))
        .addRoleOption(o => o.setName('lv60').setDescription('ยศ Lv.60').setRequired(true))
        .addRoleOption(o => o.setName('lv80').setDescription('ยศ Lv.80').setRequired(true))
        .addRoleOption(o => o.setName('lv100').setDescription('ยศ Lv.100').setRequired(true)),
    
    // ✨ คำสั่ง Giveaway แบบใหม่ (กดส่งได้เลย ไม่ต้องกรอก)
    new SlashCommandBuilder().setName('giveaway').setDescription('🎉 เปิดหน้าจอตั้งค่ากิจกรรมแจกของ (Panel หลังบ้าน)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) ออนไลน์พร้อมทำงานแล้วค่ะ!`);
    const statusMessages = ["⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", "🚀 xSwift Hub Community"];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 
    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); }
});

// ฟังก์ชันเพิ่ม XP (แบบยากๆ ตามสั่ง)
function addXP(userId, amount) {
    if (!db.users[userId]) db.users[userId] = { xp: 0, level: 1, lastMsg: 0 };
    db.users[userId].xp += amount;
    
    // สูตรคำนวณ: เลเวล * 500 (เช่น เวล 1->2 ใช้ 500XP, 2->3 ใช้ 1000XP)
    let nextLevelXP = db.users[userId].level * 500; 
    
    if (db.users[userId].xp >= nextLevelXP && db.users[userId].level < 100) {
        db.users[userId].level++;
        db.users[userId].xp = 0; // รีเซ็ต XP เพื่อเริ่มเก็บใหม่ในเลเวลถัดไป
        return true; 
    }
    return false;
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    // XP System: ได้ 1-3 XP ต่อข้อความ (คูลดาวน์ 1 นาที)
    if (Date.now() - (db.users[message.author.id]?.lastMsg || 0) > 60000) {
        const leveledUp = addXP(message.author.id, Math.floor(Math.random() * 3) + 1); // ได้ 1-3 XP
        if (db.users[message.author.id]) db.users[message.author.id].lastMsg = Date.now();
        if (leveledUp) message.channel.send(`🎊 สุดยอดเลย! คุณ <@${message.author.id}> เลเวลอัปเป็น **Lv.${db.users[message.author.id].level}** แล้วน้าา 💖`).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000));
    }
    
    // Anti-Link
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
    
    // --- 1. จัดการ Slash Commands ---
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        if (interaction.commandName === 'clear') {
            await interaction.deferReply({ ephemeral: true }); 
            const amt = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amt, true);
            return interaction.editReply({ content: `🧹 กวาดถูแชทเรียบร้อย **${amt}** ข้อความค่ะ! ✨` });
        }

        // Giveaway แบบ Panel หลังบ้าน
        if (interaction.commandName === 'giveaway') {
            await interaction.deferReply({ ephemeral: true });
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('⚙️ ตั้งค่ากิจกรรม Giveaway (หลังบ้าน)').setDescription('**กรุณาเลือกประเภทรางวัลที่ต้องการแจกค่ะ:**\n\n🛡️ **บทบาท:** แจกยศในเซิร์ฟ (บอทมอบให้เอง)\n🔗 **ลิ้งก์:** แจกซองอั่งเปา / เว็บไซต์\n📝 **ข้อความ:** แจกคีย์เกม / โค้ดลับ').setThumbnail(interaction.guild.iconURL());
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gw_type_role').setLabel('แจกบทบาท').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gw_type_link').setLabel('แจกลิ้งก์').setEmoji('🔗').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gw_type_text').setLabel('แจกข้อความ').setEmoji('📝').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // คำสั่งอื่นๆ
        await interaction.deferReply({ ephemeral: true });
        try {
            if (interaction.commandName === 'setup-level') {
                const roles = { 20: interaction.options.getRole('lv20'), 40: interaction.options.getRole('lv40'), 60: interaction.options.getRole('lv60'), 80: interaction.options.getRole('lv80'), 100: interaction.options.getRole('lv100') };
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📊 ระบบเลเวล xSwift Hub 🏆').setDescription(`ยินดีต้อนรับเข้าสู่ระบบ Rank ค่ะ! ยิ่งคุยเยอะ ยิ่งได้ยศเท่ๆ น้าา ✨\n\n**✨ วิธีการหา XP:**\n💬 **พิมพ์พูดคุย:** ได้รับ XP ทุก 1 นาที (ได้น้อยๆ ต้องขยันคุยน้า)\n🔊 **เข้าห้องเสียง:** ได้รับ XP ทุกๆ 5 นาที\n🎉 **ร่วมกิจกรรม:** ลุ้นรับ XP พิเศษจากแอดมิน\n\n**🎁 รางวัลเมื่อเลเวลอัป:**\n🎖️ **Lv.20:** <@&${roles[20].id}> (สมาชิกใหม่ไฟแรง)\n🥈 **Lv.40:** <@&${roles[40].id}> (นักคุยประจำเซิร์ฟ)\n🥇 **Lv.60:** <@&${roles[60].id}> (เข้าห้อง VIP ได้)\n💎 **Lv.80:** <@&${roles[80].id}> (เสนอกิจกรรมได้)\n👑 **Lv.100:** <@&${roles[100].id}> (**ระดับตำนาน** สิทธิพิเศษเพียบ!)\n\n*มาพยายามไปด้วยกันนะคะ ตันที่เลเวล 100 ค่ะ! 💖*`).setImage('https://i.pinimg.com/originals/a0/0c/3b/a00c3b3186105a305d2f627d35398246.gif').setFooter({ text: 'กดปุ่มด้านล่างเพื่อเช็คเลเวลตัวเองได้เลย 👇' });
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('check_level').setLabel('📊 เช็คเลเวล').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ ติดตั้งระบบเลเวลเรียบร้อยค่ะ!');
            }
            if (interaction.commandName === 'setup-verify') {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตนเข้าสู่ครอบครัว xSwift Hub ✨').setDescription(`ยินดีต้อนรับเพื่อนๆ ทุกคนนะคะ! 🎉\nเพื่อความปลอดภัยและระเบียบเรียบร้อย กรุณายืนยันตัวตนก่อนเข้าใช้งานค่ะ\n\n**📝 ขั้นตอนง่ายๆ:**\n1️⃣ อ่านกฎของเซิร์ฟเวอร์ให้เข้าใจ\n2️⃣ กดปุ่ม **"ยืนยันตัวตน"** สีเขียวด้านล่าง\n3️⃣ ระบบจะมอบยศ <@&${role.id}> ให้ทันที!\n\n*ขอให้สนุกกับการพูดคุยและกิจกรรมดีๆ นะคะ! 💖*`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif').setFooter({ text: 'ระบบยืนยันตัวตนโดย น้องปาย ⚙️' });
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('ยืนยันตัวตน').setEmoji('✅').setStyle(ButtonStyle.Success));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-ticket') {
                const embed = new EmbedBuilder().setColor('#00BFFF').setTitle('📩 ศูนย์ช่วยเหลือสมาชิก xSwift Hub 🛡️').setDescription(`สวัสดีค่ะ! หากพบปัญหาหรือต้องการติดต่อแอดมิน กดปุ่มด้านล่างได้เลยน้า 👇`).setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('เปิดตั๋วติดต่อ').setEmoji('📩').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-tell-dm') {
                const embed = new EmbedBuilder().setColor('#A020F0').setTitle('💌 บริการฝากบอกความในใจ (Tell DM) ✨').setDescription(`อยากบอกอะไรกับเพื่อนแต่ไม่กล้าทักไปตรงๆ ไหมคะ? ให้ปายช่วยเป็นสื่อกลางสิ!\nกดปุ่มด้านล่างเพื่อฝากข้อความลับได้เลย!`).setImage('https://i.pinimg.com/originals/c9/22/68/c92268d92cf2dbf96e3195683d9d3afc.gif');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_tell_dm_modal').setLabel('ส่งข้อความฝากบอก').setEmoji('💌').setStyle(ButtonStyle.Secondary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'announce') {
                const title = interaction.options.getString('title');
                const msg = interaction.options.getString('message');
                const img = interaction.options.getAttachment('image');
                const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`📢 ${title}`).setDescription(msg).setTimestamp().setFooter({ text: `ประกาศโดย: ${interaction.user.username}` });
                if (img) embed.setImage(img.url);
                await interaction.channel.send({ content: '@everyone', embeds: [embed] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-stats') {
                await interaction.guild.members.fetch();
                const total = interaction.guild.memberCount;
                const cat = await interaction.guild.channels.create({ name: '📊 STATS', type: ChannelType.GuildCategory });
                await interaction.guild.channels.create({ name: `🌎 Members: ${total}`, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
                await interaction.editReply('✅ Done!');
            }
            if (interaction.commandName === 'setup-antilink') {
                const ch = interaction.options.getChannel('channel');
                if (!db.config.antiLink.includes(ch.id)) db.config.antiLink.push(ch.id);
                await interaction.editReply(`🛡️ ห้อง <#${ch.id}> กันลิงก์แล้ว!`);
            }
        } catch (e) { console.error(e); }
    }

    // --- 2. จัดการ Buttons & Select Menus (Setup Giveaway) ---
    if (interaction.isButton() && interaction.customId.startsWith('gw_type_')) {
        const type = interaction.customId.replace('gw_type_', '');
        giveawaySetup.set(interaction.user.id, { prizeType: type });

        if (type === 'role') {
            const row = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('gw_set_role').setPlaceholder('เลือกยศที่จะแจก...'));
            await interaction.update({ content: '🛡️ **กรุณาเลือกยศที่จะแจกให้ผู้ชนะค่ะ:**', components: [row], embeds: [] });
        } else {
            const modal = new ModalBuilder().setCustomId('gw_input_prize').setTitle(type === 'link' ? 'ใส่ลิ้งก์รางวัล' : 'ใส่ข้อความรางวัล');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prize_value').setLabel(type === 'link' ? "ลิ้งก์ (เช่น อั่งเปา/เว็บ)" : "ข้อความ (เช่น คีย์เกม)").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === 'gw_set_role') {
        const setup = giveawaySetup.get(interaction.user.id);
        setup.prizeValue = interaction.values[0]; 
        giveawaySetup.set(interaction.user.id, setup);
        
        const modal = new ModalBuilder().setCustomId('gw_input_details').setTitle('ตั้งค่าเวลาและจำนวนคน');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel("ระยะเวลา (เช่น 1m, 1h)").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('winners').setLabel("จำนวนผู้ชนะ (ใส่แค่ตัวเลข)").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isChannelSelectMenu()) {
        const setup = giveawaySetup.get(interaction.user.id);
        if (interaction.customId === 'gw_select_target') {
            setup.targetCh = interaction.values[0];
            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('gw_select_log').setPlaceholder('เลือกห้องแจ้งเตือนผู้ชนะ...').addChannelTypes(ChannelType.GuildText));
            await interaction.update({ content: '🔔 **ขั้นตอนสุดท้าย: เลือกห้องสำหรับแจ้งเตือนผู้ชนะ (Log Channel):**', components: [row] });
        } else if (interaction.customId === 'gw_select_log') {
            setup.logCh = interaction.values[0];
            
            // --- เริ่มกิจกรรม (Launch) ---
            const targetCh = interaction.guild.channels.cache.get(setup.targetCh);
            const logCh = interaction.guild.channels.cache.get(setup.logCh);
            
            let displayPrize = setup.prizeType === 'role' ? `<@&${setup.prizeValue}>` : 'ความลับ (รับใน DM)';
            
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 กิจกรรม GIVEAWAY เริ่มแล้ว! ✨').setDescription(`🎁 **รางวัล:** **${displayPrize}**\n👥 **จำนวนผู้โชคดี:** **${setup.winners} ท่าน**\n⏳ **ระยะเวลา:** **${setup.duration}**\n\n*กดปุ่มด้านล่างเพื่อลงชื่อลุ้นรางวัลได้เลยน้า ขอให้โชคดีทุกคนค่ะ! 💖*`).setFooter({ text: 'Powered by Swift Hub Core ⚙️' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('เข้าร่วมกิจกรรม').setEmoji('🎁').setStyle(ButtonStyle.Primary));
            
            const gmsg = await targetCh.send({ embeds: [embed], components: [row] });
            await interaction.update({ content: `✅ **เสร็จสิ้น!** กิจกรรมเริ่มแล้วที่ <#${targetCh.id}> และจะแจ้งเตือนที่ <#${logCh.id}> ค่ะ`, components: [] });

            // Logic จบกิจกรรม
            let entry = [];
            const col = gmsg.createMessageComponentCollector({ time: ms(setup.duration) });
            col.on('collect', i => {
                if (entry.includes(i.user.id)) return i.reply({ content: 'ตัวเองกดลงชื่อไปแล้วน้า! รอลุ้นเลย 🌟', ephemeral: true });
                entry.push(i.user.id);
                i.reply({ content: 'ลงชื่อสำเร็จ! ขอให้โชคดีน้า~ 💖', ephemeral: true });
            });

            col.on('end', async () => {
                if (entry.length === 0) return gmsg.edit({ content: '❌ กิจกรรมจบแล้ว แต่ไม่มีคนเล่นเลย... เสียใจจัง 🥺', embeds: [], components: [] });
                const winners = entry.sort(() => 0.5 - Math.random()).slice(0, parseInt(setup.winners));
                const expiry = Date.now() + (10 * 60 * 60 * 1000); 
                const claimId = `claim_${expiry}_${setup.prizeType}_${setup.prizeValue}`; // แอบใส่ข้อมูลรางวัลไว้ใน ID

                const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 ประกาศรายชื่อผู้โชคดี! 🎊').setDescription(`🏆 **ผู้ชนะคือ:** ${winners.map(w => `<@${w}>`).join(', ')}\n\n⚠️ **เงื่อนไขสำคัญ:**\nกรุณากดปุ่ม **"🎁 รับรางวัลที่นี่"** ด้านล่างภายใน **10 ชั่วโมง** นะคะ\n*(หากเป็นยศระบบจะมอบให้ทันที หากเป็นของรางวัลอื่นจะส่งทาง DM ค่ะ)*`);
                const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(claimId).setLabel('🎁 รับรางวัลที่นี่').setStyle(ButtonStyle.Success));
                await gmsg.edit({ content: `🎊 ยินดีด้วยค่ะ! 🎉`, embeds: [resultEmbed], components: [claimRow] });

                const logEmbed = new EmbedBuilder().setColor('#00FF00').setTitle('📢 ประกาศผู้ชนะกิจกรรม!').setDescription(`🎉 ยินดีด้วยกับ ${winners.map(w => `<@${w}>`).join(', ')}\n\n🎁 **รางวัลที่ได้:** ||🔒 ตรวจสอบรางวัลจริงใน DM เท่านั้น|| ✨\n\n📌 *ผู้ชนะกรุณากลับไปกดปุ่มรับรางวัลในห้องกิจกรรมนะคะ!*`).setTimestamp();
                await logCh.send({ content: winners.map(w => `<@${w}>`).join(' '), embeds: [logEmbed] });
            });
        }
    }

    // --- 3. จัดการ Modals ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'gw_input_prize') {
            const setup = giveawaySetup.get(interaction.user.id);
            setup.prizeValue = interaction.fields.getTextInputValue('prize_value');
            giveawaySetup.set(interaction.user.id, setup);

            const modal = new ModalBuilder().setCustomId('gw_input_details').setTitle('ตั้งค่าเวลาและจำนวนคน');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel("ระยะเวลา (เช่น 1m, 1h)").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('winners').setLabel("จำนวนผู้ชนะ (ตัวเลข)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        } else if (interaction.customId === 'gw_input_details') {
            const setup = giveawaySetup.get(interaction.user.id);
            setup.duration = interaction.fields.getTextInputValue('duration');
            setup.winners = interaction.fields.getTextInputValue('winners');
            giveawaySetup.set(interaction.user.id, setup);

            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('gw_select_target').setPlaceholder('เลือกห้องที่จะให้กิจกรรมแสดง...').addChannelTypes(ChannelType.GuildText));
            await interaction.reply({ content: '📢 **เลือกห้องที่จะให้ปายโพสต์กิจกรรม (Target Channel):**', components: [row], ephemeral: true });
        }
        
        // Modal ฝากบอก (แก้ไขภาษาไทย)
        if (interaction.customId === 'tell_dm_modal') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const target = await client.users.fetch(interaction.fields.getTextInputValue('target_id'));
                const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('💌 มีข้อความฝากบอกถึงคุณค่ะ!').setDescription(`>>> **"${interaction.fields.getTextInputValue('dm_msg')}"**\n\n*จากผู้ไม่ประสงค์ออกนาม (ส่งผ่านระบบ Tell DM)*`);
                await target.send({ embeds: [embed] });
                await interaction.editReply(`✅ **ส่งสำเร็จ!** ปายแอบไปบอกเขาให้เรียบร้อยแล้วนะคะ จุ๊ๆ~ 🤫💖`);
            } catch { await interaction.editReply('❌ **ส่งไม่สำเร็จค่ะ** (ID ผิด หรือเขาปิดรับ DM)'); }
        }
    }

    // --- 4. จัดการปุ่มทั่วไป (Claim, Verify, Ticket) ---
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('claim_')) {
            const parts = interaction.customId.split('_');
            const expiry = parseInt(parts[1]);
            const type = parts[2];
            const prize = parts.slice(3).join('_'); // กรณีลิ้งก์มี _

            if (Date.now() > expiry) return interaction.reply({ content: `❌ **หมดเวลารับรางวัลแล้วค่ะ!** เสียใจด้วยน้า รางวัลเป็นโมฆะแล้วค่ะ 🥺`, ephemeral: true });
            if (!interaction.message.embeds[0].description.includes(interaction.user.id)) return interaction.reply({ content: `❌ **อุ๊ย! รางวัลนี้ไม่ใช่ของตัวเองน้า** ให้ผู้ชนะตัวจริงเขามากดรับนะคะ 🤭`, ephemeral: true });

            await interaction.reply({ content: `🎉 **ยินดีด้วยค่ะ!** กำลังดำเนินการส่งรางวัล...`, ephemeral: true });

            if (type === 'role') {
                const roleObj = interaction.guild.roles.cache.get(prize);
                if (roleObj) {
                    await interaction.member.roles.add(roleObj).then(() => {
                        interaction.followUp({ content: `✅ **ได้รับยศ <@&${prize}> เรียบร้อยแล้วค่ะ!** ยินดีด้วยน้า 💖`, ephemeral: true });
                    }).catch(() => interaction.followUp({ content: `❌ บอทให้ยศไม่ได้ (ยศบอทอาจจะต่ำกว่า)`, ephemeral: true }));
                }
            } else {
                try {
                    const isLink = type === 'link';
                    const dmEmbed = new EmbedBuilder().setColor('#FFD700').setTitle('🎊 รางวัลของคุณมาแล้ว! 🎊')
                        .setDescription(`ยินดีด้วยนะคะ! รางวัลที่คุณได้รับคือ:\n\n${isLink ? `🔗 **ลิ้งก์:** (กดปุ่มด้านล่างได้เลย)` : `🎁 **ของรางวัล:** \`\`\`${prize}\`\`\` (จิ้มเพื่อคัดลอก!)`}\n\n*ขอบคุณที่ร่วมกิจกรรมกับ xSwift Hub นะคะ รักน้าา~ 💖*`);
                    const dmRow = isLink ? new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🔗 คลิกเปิดลิ้งก์').setStyle(ButtonStyle.Link).setURL(prize)) : null;
                    await interaction.user.send({ embeds: [dmEmbed], components: dmRow ? [dmRow] : [] });
                    await interaction.followUp({ content: `📩 **ส่งรางวัลให้ทาง DM เรียบร้อยแล้วค่ะ!** (อย่าลืมเช็คน้า)`, ephemeral: true });
                } catch { await interaction.followUp({ content: `❌ **ส่ง DM ไม่ได้ค่ะ** รบกวนเปิด DM แล้วกดรับรางวัลใหม่อีกครั้งนะคะ`, ephemeral: true }); }
            }
        }

        // ปุ่มอื่นๆ
        if (interaction.customId.startsWith('verify_button_')) {
            const rId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(rId);
            if (role) await interaction.member.roles.add(role).then(() => interaction.reply({ content: '✅ **ยืนยันตัวตนสำเร็จ!** ยินดีต้อนรับเข้าสู่ครอบครัวของเรานะคะ 💖', ephemeral: true })).catch(() => interaction.reply({ content: '❌ ปายให้ยศไม่ได้ (ยศปายต่ำกว่า)', ephemeral: true }));
        }
        if (interaction.customId === 'open_ticket') {
            const cName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (interaction.guild.channels.cache.find(c => c.name === cName)) return interaction.reply({ content: '❌ มีห้องเดิมอยู่แล้วนะคะ', ephemeral: true });
            const ch = await interaction.guild.channels.create({ name: cName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('ปิดตั๋ว').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await ch.send({ content: `<@${OWNER_ID}>`, embeds: [new EmbedBuilder().setTitle('🎫 มีสมาชิกเปิดตั๋วใหม่ค่ะ').setColor('Green')], components: [btn] });
            await interaction.reply({ content: `✅ เปิดห้องให้แล้วค่ะ! 👉 <#${ch.id}>`, ephemeral: true });
        }
        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 กำลังปิดห้องภายใน 5 วินาที...');
            setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
        }
        if (interaction.customId === 'open_tell_dm_modal') {
            const modal = new ModalBuilder().setCustomId('tell_dm_modal').setTitle('💌 ฝากบอกข้อความ');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ไอดีผู้ใช้ (User ID)").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dm_msg').setLabel("ข้อความ (Message)").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.customId === 'check_level') {
            const d = db.users[interaction.user.id] || { xp: 0, level: 1 };
            const needed = d.level * 500;
            interaction.reply({ content: `📊 **ข้อมูลของคุณ:** เลเวล **${d.level}** | XP สะสม **${d.xp}** / **${needed}** (อีก ${needed - d.xp} ถึงจะอัปเวล!) ✨`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
