// Vercel: /api/go?u=<base64url(VHN linki)>  ->  302 yönlendirme
// Sadece vohoainamtv.github.io adresine yönlendirir (açık yönlendirme açığı olmasın diye).
module.exports = (req, res) => {
  try {
    const u = String(req.query.u || "");
    const b64 = u.replace(/-/g, "+").replace(/_/g, "/");
    const target = Buffer.from(b64 + "=".repeat((4 - (b64.length % 4)) % 4), "base64").toString("utf8");
    const url = new URL(target);
    if (url.protocol !== "https:" || url.hostname !== "vohoainamtv.github.io") {
      return res.status(400).send("gecersiz link");
    }
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, url.toString());
  } catch (e) {
    res.status(400).send("gecersiz link");
  }
};
