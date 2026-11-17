/** Données d'exemple pour le compte propriétaire, afin de voir l'appli fonctionner dès le départ. */
export async function seedDemo(c, userId) {
  const add = async (nom, appli, mode) =>
    (await c.query("insert into kora.contacts (user_id, nom, appli, mode) values ($1,$2,$3,$4) returning id", [userId, nom, appli, mode])).rows[0].id;
  const maman = await add("Maman", "whatsapp", "auto");
  const awa = await add("Awa Traoré", "whatsapp", "brouillon");
  const moussa = await add("Moussa (bureau)", "sms", "auto");
  await add("Banque Atlantique", "sms", "jamais");
  await add("Yao Kouassi", "whatsapp", "brouillon");

  const msg = (cid, nom, appli, recu, reponse, statut, interval) =>
    c.query(
      `insert into kora.messages_traites (user_id, contact_id, contact_nom, appli, recu, reponse, statut, created_at)
       values ($1,$2,$3,$4,$5,$6,$7, now() - $8::interval)`,
      [userId, cid, nom, appli, recu, reponse, statut, interval],
    );
  await msg(maman, "Maman", "whatsapp", "Tu as bien mangé mon fils ?", "Oui maman, merci ! Je t'appelle ce soir 😊", "envoye", "12 minutes");
  await msg(moussa, "Moussa (bureau)", "sms", "Tu passes au bureau demain ?", "Je regarde mon planning et je te confirme rapidement.", "envoye", "1 hour");
  await msg(awa, "Awa Traoré", "whatsapp", "On se voit samedi pour le projet ?", "Je te réponds personnellement pour fixer un moment.", "brouillon", "3 hours");
  await msg(maman, "Maman", "whatsapp", "Ton oncle demande de tes nouvelles", "Dis-lui que tout va bien, je l'appelle ce week-end !", "corrige", "1 day");

  for (const [contenu, categorie] of [
    ["J'appelle ma mère le dimanche soir.", "famille"],
    ["Je travaille de 8 h à 17 h en semaine.", "travail"],
    ["Je préfère un ton chaleureux mais bref.", "style"],
    ["Ne jamais confirmer un rendez-vous sans moi.", "règle"],
  ]) {
    await c.query("insert into kora.souvenirs (user_id, contenu, categorie) values ($1,$2,$3)", [userId, contenu, categorie]);
  }
}
