import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { theme } from "@/lib/theme";

const SUBTLE = "#8a7f73";

const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    color: theme.colors.foreground,
    backgroundColor: "#ffffff",
    lineHeight: 1.6,
    fontFamily: "Helvetica",
  },
  band: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 40,
  },
  bandEyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  bandTitle: {
    fontSize: 18,
    color: "#ffffff",
    marginTop: 5,
    fontFamily: "Times-Bold",
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 72,
  },
  title: {
    fontSize: 15,
    color: theme.colors.foreground,
    fontFamily: "Times-Bold",
    marginBottom: 8,
  },
  rule: {
    height: 2,
    width: 54,
    backgroundColor: theme.colors.primary,
    marginBottom: 20,
  },
  line: { marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: theme.colors.muted,
    paddingTop: 8,
    fontSize: 8,
    color: SUBTLE,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export async function renderContractPdf(args: {
  title: string;
  body: string;
  businessName: string;
}): Promise<Buffer> {
  const lines = args.body.split("\n");
  const doc = (
    <Document title={args.title} author={args.businessName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.bandEyebrow}>CONTRAT</Text>
          <Text style={styles.bandTitle}>{args.businessName}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{args.title}</Text>
          <View style={styles.rule} />
          {lines.map((l, i) => (
            <Text key={i} style={styles.line}>
              {l || " "}
            </Text>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>{args.businessName} — document généré automatiquement</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
