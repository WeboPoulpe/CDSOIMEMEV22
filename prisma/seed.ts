import { PrismaClient, ResourceType, BookingUnit, ReservationStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seed() {
  // Purge (ordre des FK)
  await prisma.contract.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.contractTemplate.deleteMany();
  await prisma.closedPeriod.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  // Admin
  await prisma.user.create({
    data: {
      email: "admin@demo.fr",
      password: await bcrypt.hash("demo1234", 10),
      name: "Gérant Démo",
      role: "ADMIN",
    },
  });

  // Settings
  await prisma.settings.create({
    data: {
      businessName: "La Grange Lyotaine",
      contactEmail: "contact@grange-lyotaine.fr",
      contactPhone: "03 25 00 00 00",
      fromEmail: "no-reply@grange-lyotaine.fr",
      address: "12 chemin des Vignes, 10180 Saint-Lyé",
    },
  });

  // Espaces + tarifs
  const grandeSalle = await prisma.resource.create({
    data: {
      slug: "grande-salle",
      name: "La Grande Salle",
      type: ResourceType.EVENT_SPACE,
      description: "Salle de 59 m² baignée de lumière, idéale pour séminaires, formations et événements jusqu'à 40 personnes.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 1,
      images: ["/demo/grande-salle.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HALF_DAY, priceCents: 25000, label: "Demi-journée", sortOrder: 1 },
          { unit: BookingUnit.DAY, priceCents: 45000, label: "Journée", sortOrder: 2 },
        ],
      },
    },
  });

  const coworking = await prisma.resource.create({
    data: {
      slug: "espace-coworking",
      name: "Espace Coworking",
      type: ResourceType.COWORKING,
      description: "8 postes en open-space dans une ambiance bois et plantes. Café à volonté, fibre, réservation immédiate.",
      capacity: 8,
      requiresValidation: false,
      sortOrder: 2,
      images: ["/demo/coworking.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HALF_DAY, priceCents: 1500, label: "Demi-journée", sortOrder: 1 },
          { unit: BookingUnit.DAY, priceCents: 2500, label: "Journée", sortOrder: 2 },
        ],
      },
    },
  });

  const salleReunion = await prisma.resource.create({
    data: {
      slug: "salle-reunion",
      name: "Salle de Réunion",
      type: ResourceType.MEETING_ROOM,
      description: "Salle de réunion pour 10 personnes, écran, paperboard et visio.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 3,
      images: ["/demo/salle-reunion.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HOUR, priceCents: 3000, label: "Heure", sortOrder: 1 },
          { unit: BookingUnit.HALF_DAY, priceCents: 9000, label: "Demi-journée", sortOrder: 2 },
        ],
      },
    },
  });

  const bureau1 = await prisma.resource.create({
    data: {
      slug: "bureau-1",
      name: "Bureau Privatif n°1",
      type: ResourceType.OFFICE,
      description: "Bureau fermé pour 2 personnes, mobilier inclus, accès 24/7.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 4,
      images: ["/demo/bureau-1.jpg"],
      pricings: { create: [{ unit: BookingUnit.MONTH, priceCents: 45000, label: "Mensuel", sortOrder: 1 }] },
    },
  });

  const bureau2 = await prisma.resource.create({
    data: {
      slug: "bureau-2",
      name: "Bureau Privatif n°2",
      type: ResourceType.OFFICE,
      description: "Bureau fermé pour 4 personnes, lumineux, vue sur cour.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 5,
      images: ["/demo/bureau-2.jpg"],
      pricings: { create: [{ unit: BookingUnit.MONTH, priceCents: 65000, label: "Mensuel", sortOrder: 1 }] },
    },
  });

  // Modèle de contrat global
  await prisma.contractTemplate.create({
    data: {
      name: "Contrat de location standard",
      appliesTo: null,
      active: true,
      body: [
        "CONTRAT DE MISE À DISPOSITION D'ESPACE",
        "",
        "Entre {{nom_lieu}}, sis {{adresse_lieu}},",
        "et {{client_nom}} ({{client_email}}){{#societe}}, société {{societe}}{{/societe}}.",
        "",
        "Espace réservé : {{espace}}",
        "Période : du {{date_debut}} au {{date_fin}} ({{unite}})",
        "Montant total : {{montant}}",
        "",
        "Le présent contrat confirme la réservation ci-dessus. Le règlement intérieur du lieu s'applique.",
        "",
        "Fait à Saint-Lyé. Pour {{nom_lieu}}.",
      ].join("\n"),
    },
  });

  // Réservations d'exemple — dates relatives à maintenant
  const now = new Date();
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const samples = [
    { resourceId: coworking.id, name: "Julie Martin", email: "julie@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.CONFIRMED, start: at(1, 9), end: at(1, 18), total: 2500 },
    { resourceId: coworking.id, name: "Karim Benali", email: "karim@exemple.fr", unit: BookingUnit.HALF_DAY, status: ReservationStatus.CONFIRMED, start: at(2, 9), end: at(2, 13), total: 1500 },
    { resourceId: grandeSalle.id, name: "Asso Lyon Tech", email: "contact@lyontech.fr", company: "Lyon Tech", unit: BookingUnit.DAY, status: ReservationStatus.PENDING, start: at(5, 9), end: at(5, 18), total: 45000 },
    { resourceId: grandeSalle.id, name: "Formation Pro", email: "rh@formationpro.fr", company: "FormationPro", unit: BookingUnit.HALF_DAY, status: ReservationStatus.PENDING, start: at(7, 14), end: at(7, 18), total: 25000 },
    { resourceId: salleReunion.id, name: "Cabinet Durand", email: "durand@cabinet.fr", company: "Cabinet Durand", unit: BookingUnit.HALF_DAY, status: ReservationStatus.CONFIRMED, start: at(3, 9), end: at(3, 13), total: 9000 },
    { resourceId: salleReunion.id, name: "Léa Petit", email: "lea@exemple.fr", unit: BookingUnit.HOUR, status: ReservationStatus.PENDING, start: at(4, 10), end: at(4, 11), total: 3000 },
    { resourceId: coworking.id, name: "Tom Bernard", email: "tom@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.COMPLETED, start: at(-3, 9), end: at(-3, 18), total: 2500 },
    { resourceId: grandeSalle.id, name: "Mariage Dupont", email: "dupont@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.COMPLETED, start: at(-7, 9), end: at(-7, 18), total: 45000 },
    { resourceId: bureau1.id, name: "Freelance Co", email: "hello@freelance.co", company: "Freelance Co", unit: BookingUnit.MONTH, status: ReservationStatus.CONFIRMED, start: at(0, 0), end: at(30, 0), total: 45000 },
    { resourceId: salleReunion.id, name: "Studio Vidéo", email: "studio@exemple.fr", unit: BookingUnit.HALF_DAY, status: ReservationStatus.COMPLETED, start: at(-2, 14), end: at(-2, 18), total: 9000 },
  ];

  for (const s of samples) {
    await prisma.reservation.create({
      data: {
        resourceId: s.resourceId,
        customerName: s.name,
        customerEmail: s.email,
        company: s.company ?? null,
        startAt: s.start,
        endAt: s.end,
        unit: s.unit,
        status: s.status,
        totalCents: s.total,
      },
    });
  }

  console.log("✅ Seed terminé : 5 espaces, 10 réservations, 1 admin, 1 contrat type.");
}

// Exécution directe (tsx prisma/seed.ts) — ne pas déclencher à l'import
const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
