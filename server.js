import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits, Events } from 'discord.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks
  ]
});

const app = express();
app.use(bodyParser.json());

client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});
client.login(process.env.DISCORD_TOKEN);

app.post('/coleta', async (req, res) => {
  let {
    id,
    cliente,
    descricao,
    contato,
    prazo,
    criterio,
    cardapio_links = [],
    infos_cardapio,
    horarios_links = [],
    taxas_links = [],
    taxa_links = [],
    redes_sociais,
    logo_links = [],
    imagens_informacoes = [],
    infos_gerais
  } = req.body;

  try {
    const guild = client.guilds.cache.get(process.env.SERVIDOR_ID);
    if (!guild) throw new Error('Guild não encontrada no cache. Verifique o SERVIDOR_ID.');

    const canalColeta = guild.channels.cache.get(process.env.CANAL_MONITORADO_ID);
    if (!canalColeta) throw new Error('Canal de coleta não encontrado no cache. Verifique o CANAL_MONITORADO_ID.');

    // ✅ Interpretação do critério com segurança
    const criterioLimpo = (criterio || "").toLowerCase().trim();
    const emoji = criterioLimpo.includes('grande')
      ? '🔴'
      : criterioLimpo.includes('mediano')
        ? '🟠'
        : '🟢';

    const msgInicial = [
      `📌 ID: \`${id}\``,
      `➡️ Descrição do Cliente: \`${descricao || 'Sem obs'}\``,
      `➡️ Observação do Cardápio: \`${infos_cardapio || 'Sem obs'}\``,
      `➡️ Contato do Cliente: \`${contato}\``,
      `➡️ Prazo de Entrega Interno: \`${prazo}\``,
      `➡️ Critério: \`${emoji}\``
    ].join('\n');

    const nomeTopico = `(${id})`;
    const msg = await canalColeta.send(msgInicial);

    const thread = await msg.startThread({
      name: nomeTopico,
      autoArchiveDuration: 1440,
      reason: 'Nova coleta de cardápio'
    });

    // Unificação taxa(s) para compatibilidade
    taxas_links = Array.isArray(taxas_links) ? taxas_links : taxa_links || [];

    const limparLinks = (lista) =>
      (Array.isArray(lista) ? lista : [lista])
        .filter(Boolean)
        .map(l =>
          l
            .toString()
            .trim()
            .replace(/^["'\[\]]+|["'\[\]]+$/g, '') // remove aspas e colchetes nas pontas
            .replace(/"/g, '')                   // remove aspas restantes internas
        );


    let conteudoThread = '';

    if (cardapio_links?.length)
      conteudoThread += `📎 **Cardápio (arquivos/links):**\n${limparLinks(cardapio_links).join('\n')}\n\n`;

    if (infos_cardapio)
      conteudoThread += `ℹ️ **Informações sobre o cardápio:**\n${infos_cardapio}\n\n`;

    if (horarios_links?.length)
      conteudoThread += `🕒 **Horários:**\n${limparLinks(horarios_links).join('\n')}\n\n`;

    if (taxas_links?.length)
      conteudoThread += `🚚 **Taxas de Entrega:**\n${limparLinks(taxas_links).join('\n')}\n\n`;

    if (redes_sociais)
      conteudoThread += `🌐 **Redes Sociais:**\n${redes_sociais}\n\n`;

    if (logo_links?.length)
      conteudoThread += `🖼️ **Logo e Capa:**\n${limparLinks(logo_links).join('\n')}\n\n`;

    if (imagens_informacoes?.length)
      conteudoThread += `🖼️ **Imagens para Informações:**\n${limparLinks(imagens_informacoes).join('\n')}\n\n`;

    if (infos_gerais)
      conteudoThread += `🗒️ **Informações Gerais:**\n${infos_gerais}\n\n`;

    if (conteudoThread.length)
      await thread.send(conteudoThread.trim());

    return res.status(200).json({ status: 'ok', thread: nomeTopico });

  } catch (error) {
    console.error('❌ Erro ao processar coleta:', error);
    return res.status(500).json({ erro: 'Erro ao processar coleta.' });
  }
});

app.get('/check-is-on', (req, res) => {
  return res.sendStatus(200);
});

// Inicia o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API rodando...`));

