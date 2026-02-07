// Angel Bot 24/7 🪽
// By Pai 💖 For ซีม่อน

require("dotenv").config();

const {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ChannelType,
} = require("discord.js");

const {
	joinVoiceChannel,
	entersState,
	VoiceConnectionStatus,
} = require("@discordjs/voice");

const cron = require("node-cron");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;

// ================= CLIENT =================

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
	],
});

let stayConnection = null;
let stayChannel = null;

let autoGreetChannel = null;

// ================= READY =================

client.once("ready", async () => {
	console.log(`✅ Logged in as ${client.user.tag}`);

	// Register Commands
	const commands = [

		// /stayvc
		new SlashCommandBuilder()
			.setName("stayvc")
			.setDescription("ให้บอทเข้า VC ค้าง 24/7 (Owner Only)")
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

		// /serverinfo
		new SlashCommandBuilder()
			.setName("serverinfo")
			.setDescription("ดูข้อมูลเซิฟเวอร์ (Owner Only)")
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

		// /autogreet
		new SlashCommandBuilder()
			.setName("autogreet")
			.setDescription("ตั้งค่าระบบทักทายอัตโนมัติ")
			.addChannelOption(opt =>
				opt.setName("channel")
					.setDescription("เลือกช่องส่งข้อความ")
					.setRequired(true)
			)
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	].map(cmd => cmd.toJSON());

	await client.application.commands.set(commands);

	console.log("✅ Slash Commands Registered");
});

// ================= INTERACTION =================

client.on("interactionCreate", async (interaction) => {

	if (!interaction.isChatInputCommand()) return;

	const ownerId = interaction.guild.ownerId;

	// Owner Check
	if (interaction.user.id !== ownerId) {
		return interaction.reply({
			content: "❌ คำสั่งนี้ใช้ได้เฉพาะเจ้าของเซิฟเท่านั้นนะค้าบ 💢",
			ephemeral: true
		});
	}

	// ================= /stayvc =================

	if (interaction.commandName === "stayvc") {

		const voiceChannels = interaction.guild.channels.cache
			.filter(ch => ch.type === ChannelType.GuildVoice);

		if (!voiceChannels.size) {
			return interaction.reply("❌ ไม่มีห้องเสียงในเซิฟนี้นะค้าบ");
		}

		const menu = new StringSelectMenuBuilder()
			.setCustomId("vc_select")
			.setPlaceholder("เลือกห้องเสียงที่ต้องการ")
			.addOptions(
				voiceChannels.map(vc => ({
					label: vc.name,
					value: vc.id
				}))
			);

		const row = new ActionRowBuilder().addComponents(menu);

		await interaction.reply({
			content: "🎧 เลือกห้องเสียงที่บอทจะเข้าเลยค้าบ",
			components: [row],
			ephemeral: true
		});
	}

	// ================= /serverinfo =================

	if (interaction.commandName === "serverinfo") {

		await interaction.guild.members.fetch();

		const members = interaction.guild.members.cache;

		const humans = members.filter(m => !m.user.bot);
		const bots = members.filter(m => m.user.bot);

		let list = "";

		members.forEach(m => {
			list += `👤 ${m.user.tag} | 📅 ${m.joinedAt.toLocaleString("th-TH")}\n`;
		});

		const embed = new EmbedBuilder()
			.setColor(0xffc0cb)
			.setTitle("📊 ข้อมูลเซิฟเวอร์")
			.setDescription(
				`👥 สมาชิก: ${humans.size}\n` +
				`🤖 บอท: ${bots.size}\n\n` +
				`📌 รายชื่อทั้งหมด:\n${list}`
			)
			.setFooter({ text: "Angel Bot 24/7 🪽" })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	}

	// ================= /autogreet =================

	if (interaction.commandName === "autogreet") {

		const channel = interaction.options.getChannel("channel");

		if (!channel.isTextBased()) {
			return interaction.reply("❌ ต้องเป็นช่องข้อความเท่านั้นนะค้าบ");
		}

		autoGreetChannel = channel.id;

		await interaction.reply(`✅ ตั้งค่าทักทายอัตโนมัติที่ <#${channel.id}> แล้วค้าบ 💖`);
	}
});

// ================= VC SELECT =================

client.on("interactionCreate", async (interaction) => {

	if (!interaction.isStringSelectMenu()) return;

	if (interaction.customId !== "vc_select") return;

	const channelId = interaction.values[0];

	const channel = interaction.guild.channels.cache.get(channelId);

	if (!channel) {
		return interaction.reply("❌ ไม่พบห้องเสียง");
	}

	try {

		stayChannel = channel;

		stayConnection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
			selfDeaf: false,
		});

		await entersState(stayConnection, VoiceConnectionStatus.Ready, 30000);

		// Auto Reconnect
		stayConnection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				stayConnection.destroy();

				stayConnection = joinVoiceChannel({
					channelId: stayChannel.id,
					guildId: stayChannel.guild.id,
					adapterCreator: stayChannel.guild.voiceAdapterCreator,
				});

			} catch (e) {
				console.log("Reconnect Failed:", e);
			}
		});

		await interaction.update({
			content: `✅ บอทเข้า **${channel.name}** แล้วค้าบ 🪽`,
			components: []
		});

	} catch (e) {

		console.log(e);

		await interaction.update({
			content: "❌ เข้า VC ไม่สำเร็จนะค้าบ",
			components: []
		});
	}
});

// ================= AUTO GREET =================

function sendEmbed(title, msg) {

	if (!autoGreetChannel) return;

	const channel = client.channels.cache.get(autoGreetChannel);

	if (!channel) return;

	const embed = new EmbedBuilder()
		.setColor(0xffb6c1)
		.setTitle(title)
		.setDescription(msg)
		.setFooter({ text: "Angel Bot 24/7 🪽" })
		.setTimestamp();

	channel.send({
		content: "@everyone @here",
		embeds: [embed]
	});
}

// 06:00
cron.schedule("0 6 * * *", () => {
	sendEmbed("🌤️ สวัสดีตอนเช้า",
		"💖 อรุณสวัสดิ์ค้าบทุกคนน~\n🌞 ตื่นได้แล้วนะ\n🛁 อาบน้ำ กินข้าว\n📚 ไปเรียน ไปทำงาน\n✨ สู้ๆนะค้าบ 💕"
	);
});

// 12:00
cron.schedule("0 12 * * *", () => {
	sendEmbed("🍽️ เที่ยงแล้ว",
		"🍛 อย่าลืมกินข้าวนะค้าบ\n🥤 ดื่มน้ำเยอะๆ\n🫶 ดูแลตัวเองด้วยน้า"
	);
});

// 17:00
cron.schedule("0 17 * * *", () => {
	sendEmbed("🌇 ตอนเย็นแล้ว",
		"😴 เหนื่อยกันมาทั้งวัน\n🍜 ไปหาอะไรกิน\n💖 เก่งมากทุกคน"
	);
});

// 22:00
cron.schedule("0 22 * * *", () => {
	sendEmbed("🌙 Good Night",
		"📱 วางมือถือบ้างน้า\n🛏️ ไปนอนได้แล้ว\n💫 ฝันดีค้าบ"
	);
});

// 00:00
cron.schedule("0 0 * * *", () => {
	sendEmbed("🎊 วันใหม่แล้ว",
		"🌈 เริ่มต้นใหม่อีกวัน\n🚀 ขอให้ปังๆ\n🪽 Angel อยู่ข้างๆเสมอ"
	);
});

// ================= LOGIN =================

client.login(TOKEN);
