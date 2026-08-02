// backend/src/utils/textBuilders.js
//
// Transforme chaque enregistrement métier (Projet, Tâche, Équipe...) en un
// petit texte en français, lisible et dense en information : c'est ce
// texte qui est ensuite converti en embedding et indexé dans la base
// vectorielle. La qualité de ces textes conditionne directement la
// qualité des réponses de l'assistant IA.

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'non définie');

function projetToText(p) {
  return [
    `Projet #${p.id} : ${p.nom}`,
    p.description ? `Description : ${p.description}` : null,
    `Statut : ${p.statut} | Priorité : ${p.priorite}`,
    `Période : du ${fmtDate(p.dateDebut)} au ${fmtDate(p.dateFin)}`,
    p.budget ? `Budget : ${p.budget} FCFA` : null,
    p.chefProjet ? `Chef de projet : ${p.chefProjet.nom} (${p.chefProjet.email})` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function tacheToText(t) {
  return [
    `Tâche #${t.id} : ${t.titre}`,
    t.description ? `Description : ${t.description}` : null,
    `Statut : ${t.statut} | Priorité : ${t.priorite} | Avancement : ${t.avancement}%`,
    `Échéance : du ${fmtDate(t.dateDebut)} au ${fmtDate(t.dateFinPrevue)}`,
    t.projet ? `Projet associé : ${t.projet.nom} (#${t.projet.id})` : null,
    t.assigneA ? `Assignée à : ${t.assigneA.nom}` : 'Non assignée',
  ]
    .filter(Boolean)
    .join('\n');
}

function equipeToText(e) {
  const membres = (e.membres || [])
    .map((m) => m.utilisateur?.nom)
    .filter(Boolean)
    .join(', ');
  return [
    `Équipe #${e.id} : ${e.nom}`,
    e.description ? `Description : ${e.description}` : null,
    e.chefEquipe ? `Chef d'équipe : ${e.chefEquipe.nom}` : null,
    e.projet ? `Projet associé : ${e.projet.nom} (#${e.projet.id})` : 'Non rattachée à un projet',
    membres ? `Membres : ${membres}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function rapportToText(r) {
  return [
    `Rapport #${r.id} : ${r.titre}`,
    `Description : ${r.description}`,
    `Statut de la tâche au moment du rapport : ${r.statutTache} | Avancement : ${r.avancement}%`,
    r.observations ? `Observations : ${r.observations}` : null,
    r.tache ? `Tâche concernée : ${r.tache.titre} (#${r.tache.id})` : null,
    r.chefEquipe ? `Rédigé par : ${r.chefEquipe.nom}` : null,
    `Date : ${fmtDate(r.dateCreation)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function inspectionToText(i) {
  return [
    `Inspection #${i.id}`,
    i.projet ? `Projet inspecté : ${i.projet.nom} (#${i.projet.id})` : null,
    i.inspecteur ? `Inspecteur : ${i.inspecteur.nom}` : null,
    `Date : ${fmtDate(i.dateInspection)} | Statut : ${i.statut}`,
    i.conforme === true ? 'Conformité : conforme' : i.conforme === false ? 'Conformité : non conforme' : null,
    i.observations ? `Observations : ${i.observations}` : null,
    i.recommandations ? `Recommandations : ${i.recommandations}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  projetToText,
  tacheToText,
  equipeToText,
  rapportToText,
  inspectionToText,
};
