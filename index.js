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

// --- ⚙️ ตั้งค่าส่วนตัวของซีม่อน ---
const TOKEN = process.env.TOKEN || 'ใส่_TOKEN_บอท_ตรงนี้'; 
const CLIENT_ID = process.env.CLIENT_ID || 'ใส่_CLIENT_ID_บอท_ตรงนี้'; 
const OWNER_ID = process.env.OWNER_ID || 'ใส่_ไอดี_ซีม่อน_ตรงนี้'; 

// --- 🛡️ ระบบกันบอทตาย (Anti-Crash) ---
process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

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
    new SlashCommandBuilder().setName('setup-ticket').setDescription('สร้างหน้า Panel ตั๋ว').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-stats').setDescription('สร้างห้องสถิติ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('announce').setDescription('ประกาศข่าว').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('title').setDescription('หัวข้อ').setRequired(true)).addStringOption(o => o.setName('message').setDescription('เนื้อหา').setRequired(true)).addAttachmentOption(o => o.setName('image').setDescription('รูป')),
    new SlashCommandBuilder().setName('clear').setDescription('ลบข้อความ').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('amount').setDescription('จำนวน').setMinValue(1).setMaxValue(100).setRequired(true)),
    
    // ✨ คำสั่งใหม่: ระบบฝากบอก DM
    new SlashCommandBuilder()
        .setName('setup-tell-dm')
        .setDescription('สร้างหน้า Panel ฝากบอกข้อความทาง DM (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- 🤖 เริ่มการทำงานของบอท ---
client.once('ready', async () => {
    console.log(`✅ น้องปาย (Swift Hub Core) มารายงานตัวแล้วค่ะ!`);
    
    const statusMessages = [
        "⚙️ Swift Hub Core | Active", "👑 Powered by Zemon Źx", "💖 น้องปายรักพี่ซีม่อนที่สุด~", 
        "🚀 ระบบยืนยันตัวตน & ตั๋ว 24/7", "🛡️ Swift Hub Security", "✨ ยินดีต้อนรับสู่ xSwift Hub", 
        "📩 ต้องการความช่วยเหลือ? เปิดตั๋วได้เลย!", "🤖 บอททำงานปกติ 100%", "💻 Zemon Dev is Coding...", "🌟 อย่าลืมกดรับยศกันนะค้าบ"
    ];
    let currentIndex = 0;
    setInterval(() => {
        client.user.setPresence({ activities: [{ name: statusMessages[currentIndex], type: ActivityType.Playing }], status: 'online' });
        currentIndex = (currentIndex + 1) % statusMessages.length;
    }, 3000); 

    // Server Stats Update (10 mins)
    setInterval(async () => {
        client.guilds.cache.forEach(async guild => {
            try {
                await guild.members.fetch(); 
                const total = guild.memberCount;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const humans = total - bots;
                const humanChannel = guild.channels.cache.find(c => c.name.startsWith('Mw 👨・Members:'));
                const botChannel = guild.channels.cache.find(c => c.name.startsWith('Bot 🤖・Bots:'));
                const totalChannel = guild.channels.cache.find(c => c.name.startsWith('All 🌎・Total:'));
                if (humanChannel) humanChannel.setName(`Mw 👨・Members: ${humans.toLocaleString()}`).catch(() => {});
                if (botChannel) botChannel.setName(`Bot 🤖・Bots: ${bots.toLocaleString()}`).catch(() => {});
                if (totalChannel) totalChannel.setName(`All 🌎・Total: ${total.toLocaleString()}`).catch(() => {});
            } catch (err) {}
        });
    }, 600000);

    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); console.log('✨ Commands Registered!'); } catch (e) { console.error(e); }
});

// --- 👂 รอรับคำสั่ง (Interaction) ---
client.on('interactionCreate', async interaction => {
    
    // 🔒 เช็คสิทธิ์เฉพาะซีม่อน (สำหรับคำสั่ง setup ต่างๆ)
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ คำสั่งนี้สำหรับซีม่อนเท่านั้นค่ะ!', ephemeral: true });

        // 1. Setup Verify
        if (interaction.commandName === 'setup-verify') {
            await interaction.deferReply({ ephemeral: true });
            const role = interaction.options.getRole('role');
            const embed = new EmbedBuilder().setColor('#FF69B4').setTitle('✨ ยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์ ✨').setDescription(`ยินดีต้อนรับเข้าสู่ **${interaction.guild.name}** นะคะ! 🎉\n\nกดปุ่มด้านล่างเพื่อรับยศ <@&${role.id}> ค่ะ`).setImage('https://media.discordapp.net/attachments/1079089989930745917/1105497258381594684/standard.gif').setFooter({ text: 'ระบบโดย น้องปาย ⚙️' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_button_${role.id}`).setLabel('รับยศเข้าดิส').setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Done!');
        }

        // 2. Setup Ticket
        if (interaction.commandName === 'setup-ticket') {
            await interaction.deferReply({ ephemeral: true });
            const embed = new EmbedBuilder().setColor('#00BFFF').setTitle('📩 ติดต่อสอบถาม / สั่งซื้อสินค้า 🛒').setDescription(`สวัสดีค่ะ! ยินดีต้อนรับสู่ **Swift Hub Support** ⚙️\n\nกดปุ่มเพื่อเปิดห้องส่วนตัวค่ะ 👇`).setImage('https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg?ex=698ec146&is=698d6fc6&hm=aaeea6b0b0495ba731097654467c894e4a143bf26928bd961eaa0fc751621946&').setFooter({ text: 'Swift Hub Core System 🛡️' });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('เปิดตั๋วติดต่อ').setEmoji('📩').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Done!');
        }

        // 3. Setup Stats
        if (interaction.commandName === 'setup-stats') {
            await interaction.deferReply({ ephemeral: true });
            await interaction.guild.members.fetch();
            const total = interaction.guild.memberCount;
            const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
            const humans = total - bots;
            const category = await interaction.guild.channels.create({ name: '📊 SERVER STATS', type: ChannelType.GuildCategory, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }] });
            await interaction.guild.channels.create({ name: `Mw 👨・Members: ${humans.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.guild.channels.create({ name: `All 🌎・Total: ${total.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.guild.channels.create({ name: `Bot 🤖・Bots: ${bots.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] }] });
            await interaction.editReply('✅ Done!');
        }

        // 4. Announce
        if (interaction.commandName === 'announce') {
            await interaction.deferReply({ ephemeral: true });
            const title = interaction.options.getString('title');
            const message = interaction.options.getString('message');
            const image = interaction.options.getAttachment('image');
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`📢 ${title}`).setDescription(message).setTimestamp().setFooter({ text: `ประกาศโดย: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
            if (image) embed.setImage(image.url);
            await interaction.channel.send({ content: '@everyone', embeds: [embed] });
            await interaction.editReply('✅ Done!');
        }

        // 5. Clear
        if (interaction.commandName === 'clear') {
            await interaction.deferReply({ ephemeral: true });
            const amount = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true).catch(() => {});
            await interaction.editReply(`🧹 Cleared ${amount} messages!`);
        }

        // 6. ✨ Setup Tell DM (ฝากบอก) ✨
        if (interaction.commandName === 'setup-tell-dm') {
            await interaction.deferReply({ ephemeral: true });
            
            const embed = new EmbedBuilder()
                .setColor('#A020F0') // สีม่วง
                .setTitle('💌 ฝากบอกข้อความ (Anonymous DM)')
                .setDescription(`สวัสดีค่ะ! อยากฝากข้อความถึงใครในเซิร์ฟแต่ไม่กล้าบอกตรงๆ ไหมคะ? 😳\n\n**น้องปายอาสาเป็นแม่สื่อให้เอง!** 💖\n\nกดปุ่ม **"📩 ส่งข้อความฝากบอก"** ด้านล่าง\nระบุ **User ID** ของคนคนนั้น แล้วพิมพ์ความในใจได้เลย!\n\n*ปายจะส่งข้อความไปหาเขาทาง DM ให้ทันทีค่ะ~* 🚀`)
                .setImage('https://i.pinimg.com/originals/c9/22/68/c92268d92cf2dbf96e3195683d9d3afc.gif') // รูป GIF น่ารักๆ (เปลี่ยนได้)
                .setFooter({ text: 'Service by Swift Hub Core ⚙️', iconURL: client.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_tell_dm_modal')
                    .setLabel('ส่งข้อความฝากบอก')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Secondary) // ปุ่มสีเทา
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: '✅ สร้าง Panel ฝากบอกเรียบร้อยค่ะ!' });
        }
    }

    // --- Handling Buttons & Modals ---
    
    // A. ปุ่มเปิด Modal ฝากบอก (Tell DM)
    if (interaction.isButton() && interaction.customId === 'open_tell_dm_modal') {
        const modal = new ModalBuilder()
            .setCustomId('tell_dm_modal')
            .setTitle('💌 ฝากบอกข้อความ');

        const userIdInput = new TextInputBuilder()
            .setCustomId('target_user_id')
            .setLabel("User ID ของคนที่จะส่งหา")
            .setPlaceholder("เช่น 123456789012345678")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const messageInput = new TextInputBuilder()
            .setCustomId('dm_message')
            .setLabel("ข้อความที่อยากบอก")
            .setPlaceholder("พิมพ์ความในใจตรงนี้เลย... (ยาวได้เต็มที่!)")
            .setStyle(TextInputStyle.Paragraph) // พิมพ์ได้หลายบรรทัด
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
        const secondActionRow = new ActionRowBuilder().addComponents(messageInput);

        modal.addComponents(firstActionRow, secondActionRow);
        await interaction.showModal(modal);
    }

    // B. เมื่อกดส่ง Modal (Tell DM)
    if (interaction.isModalSubmit() && interaction.customId === 'tell_dm_modal') {
        await interaction.deferReply({ ephemeral: true });

        const targetId = interaction.fields.getTextInputValue('target_user_id');
        const messageContent = interaction.fields.getTextInputValue('dm_message');
        const sender = interaction.user;

        try {
            // หาตัวผู้รับ
            const targetUser = await client.users.fetch(targetId);
            
            // สร้าง Embed สวยๆ ไปส่ง
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF69B4') // สีชมพู
                .setTitle('💌 มีข้อความฝากบอกถึงคุณค่ะ!')
                .setDescription(`**จาก:** ${sender.tag} (||${sender.id}||)\n\n📜 **ข้อความ:**\n>>> ${messageContent}`)
                .setFooter({ text: 'ส่งผ่านระบบ Swift Hub Core ⚙️', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            // ส่ง DM
            await targetUser.send({ embeds: [dmEmbed] });

            await interaction.editReply({ content: `✅ **สำเร็จ!** ปายส่งข้อความไปหา **${targetUser.tag}** เรียบร้อยแล้วค่ะ! 🚀` });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ **ส่งไม่สำเร็จง่า...**\n1. เช็คว่า User ID ถูกต้องไหม\n2. เขาอาจจะปิดรับ DM จากคนแปลกหน้าก็ได้ค่ะ 🥺` });
        }
    }

    // C. ปุ่มอื่นๆ (Verify, Ticket)
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('verify_button_')) {
            await interaction.deferReply({ ephemeral: true });
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                try {
                    await interaction.member.roles.add(role);
                    await interaction.editReply('✅ ได้รับยศแล้วค่ะ!');
                } catch { await interaction.editReply('❌ ยศปายต่ำกว่าค่ะ'); }
            } else { await interaction.editReply('❌ ไม่พบยศ'); }
        }

        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });
            const cleanName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
            const channelName = `ticket-${cleanName}`;
            if (interaction.guild.channels.cache.find(c => c.name === channelName)) return interaction.editReply(`❌ มีห้องอยู่แล้วค่ะ`);

            try {
                const ch = await interaction.guild.channels.create({ name: channelName, type: ChannelType.GuildText, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] });
                const embed = new EmbedBuilder().setColor('#00FF00').setTitle(`🎫 Ticket: ${interaction.user.tag}`).setDescription(`รอสักครู่นะคะ ซีม่อนกำลังมา!`).setTimestamp();
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
                await ch.send({ content: `<@${OWNER_ID}>`, embeds: [embed], components: [row] });
                await interaction.editReply(`✅ เปิดตั๋วแล้ว: <#${ch.id}>`);
            } catch { await interaction.editReply('❌ สร้างห้องไม่ได้'); }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 Deleting in 5s...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(TOKEN);
