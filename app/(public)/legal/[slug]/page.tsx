import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  "mentions-legales": "Mentions légales",
  confidentialite: "Politique de confidentialité",
  cgu: "Conditions générales d'utilisation",
  cookies: "Gestion des cookies",
};

const CONTACT = "contact@cdsoimeme.fr";

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!TITLES[slug]) notFound();

  const prat = await prisma.profiles.findFirst({
    where: { OR: [{ nom_praticienne: { not: null } }, { siret: { not: null } }] },
    select: { nom_praticienne: true, forme_juridique: true, siret: true, adresse_entreprise: true },
  });
  const dbRgpd =
    slug === "confidentialite"
      ? await prisma.legal_documents.findFirst({ where: { type: "rgpd", actif: true } })
      : null;

  const nomPrat = prat?.nom_praticienne || "Charline";
  const forme = prat?.forme_juridique || "Entreprise individuelle (à compléter)";
  const siret = prat?.siret || "à compléter";
  const adresse = prat?.adresse_entreprise || "Sainte-Savine (10300) — adresse complète à compléter";

  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-foreground/55 hover:text-foreground">← Accueil</Link>
      <h1 className="mt-4 font-serif text-4xl text-foreground">{TITLES[slug]}</h1>
      <div className="hairline-gold mt-5 h-px w-20 opacity-50" />

      <div className="legal mt-8 space-y-5 text-foreground/75">
        {slug === "mentions-legales" && (
          <>
            <Sec title="Éditeur du site">
              <p>{nomPrat} — <strong>CD soi-même</strong></p>
              <p>Forme juridique : {forme}</p>
              <p>SIRET : {siret}</p>
              <p>Adresse : {adresse}</p>
              <p>Contact : {CONTACT}</p>
              <p>Directrice de la publication : {nomPrat}.</p>
            </Sec>
            <Sec title="Hébergement">
              <p>Application hébergée par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, USA — vercel.com.</p>
              <p>Base de données hébergée par <strong>Neon</strong> (Union européenne) — neon.tech.</p>
              <p>Envoi d'emails : <strong>Brevo</strong> (Sendinblue SAS, France) — brevo.com.</p>
            </Sec>
            <Sec title="Propriété intellectuelle">
              <p>L'ensemble des contenus (textes, photographies, logo) est la propriété de {nomPrat} ou de leurs auteurs respectifs et ne peut être reproduit sans autorisation.</p>
            </Sec>
          </>
        )}

        {slug === "confidentialite" && (
          <>
            <Sec title="Responsable du traitement">
              <p>{nomPrat} (CD soi-même), joignable à {CONTACT}.</p>
            </Sec>
            <Sec title="Données collectées">
              <p>Identité et contact (prénom, nom, email, téléphone, ville), informations de rendez-vous, échanges via la messagerie et documents partagés, et — lorsque tu remplis le questionnaire d'accueil — des informations relatives à ton bien-être et ton ressenti.</p>
              <p><strong>Données de santé / bien-être :</strong> ces informations relèvent des catégories particulières (article 9 du RGPD) et ne sont traitées qu'avec ton <strong>consentement explicite</strong>.</p>
            </Sec>
            <Sec title="Finalités et base légale">
              <ul className="list-disc space-y-1 pl-5">
                <li>Gérer les demandes et rendez-vous — exécution de la relation.</li>
                <li>Assurer ton accompagnement et son suivi — consentement.</li>
                <li>Communiquer avec toi (emails de confirmation, messagerie) — intérêt légitime / consentement.</li>
              </ul>
            </Sec>
            <Sec title="Destinataires">
              <p>Tes données sont destinées à {nomPrat} uniquement. Des sous-traitants techniques interviennent : Brevo (emails), Neon (base de données, UE), Vercel (hébergement). Aucune donnée n'est vendue ni cédée à des tiers à des fins commerciales.</p>
            </Sec>
            <Sec title="Durée de conservation">
              <p>Les données sont conservées le temps de l'accompagnement, puis archivées puis supprimées dans un délai raisonnable (en principe 3 ans après le dernier contact), sauf obligation légale contraire.</p>
            </Sec>
            <Sec title="Tes droits">
              <p>Tu disposes des droits d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité et du droit de retirer ton consentement à tout moment, en écrivant à {CONTACT}.</p>
              <p>Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
            </Sec>
            <Sec title="Sécurité">
              <p>L'accès à ton espace est protégé par mot de passe. Les échanges sont chiffrés (HTTPS) et l'accès à tes données est strictement réservé à ta praticienne.</p>
            </Sec>
            {dbRgpd?.contenu && (
              <Sec title="Note de ta praticienne">
                <div dangerouslySetInnerHTML={{ __html: dbRgpd.contenu }} />
              </Sec>
            )}
          </>
        )}

        {slug === "cgu" && (
          <>
            <Sec title="Objet">
              <p>Les présentes conditions régissent l'utilisation du site CD soi-même et de l'espace personnel.</p>
            </Sec>
            <Sec title="Réservation">
              <p>Une demande de rendez-vous n'est pas un rendez-vous confirmé : la praticienne la valide manuellement. Aucun paiement n'est effectué en ligne.</p>
            </Sec>
            <Sec title="Espace personnel">
              <p>L'accès est personnel et confidentiel. Tu es responsable de la confidentialité de ton mot de passe.</p>
            </Sec>
            <Sec title="Responsabilité">
              <p>L'accompagnement proposé ne se substitue pas à un avis ou un traitement médical. En cas d'urgence, contacte un professionnel de santé ou le 15.</p>
            </Sec>
            <Sec title="Droit applicable">
              <p>Les présentes conditions sont soumises au droit français.</p>
            </Sec>
          </>
        )}

        {slug === "cookies" && (
          <>
            <Sec title="Cookies utilisés">
              <p>Ce site utilise uniquement des cookies <strong>strictement nécessaires</strong> à son fonctionnement : maintien de ta session de connexion et sécurité (protection CSRF).</p>
            </Sec>
            <Sec title="Pas de traceurs">
              <p>Aucun cookie de mesure d'audience, de publicité ou de réseau social tiers n'est déposé. Ces cookies essentiels sont exemptés de consentement préalable conformément aux recommandations de la CNIL.</p>
            </Sec>
            <Sec title="Gestion">
              <p>Tu peux configurer ton navigateur pour refuser les cookies ; le fonctionnement de l'espace de connexion pourrait alors être altéré.</p>
            </Sec>
          </>
        )}

        <p className="pt-6 text-sm text-foreground/45">
          Une question sur tes données ? Écris-nous à {CONTACT}.
        </p>
      </div>
    </article>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}
