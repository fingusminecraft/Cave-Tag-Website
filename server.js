
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const FRONTEND_URL =
    "https://fingusminecraft.github.io/Cave-Tag-Website/";


// ================================
// DISCORD LOGIN
// ================================

app.get("/login", (req, res) => {

    const params = new URLSearchParams();

    params.set("client_id", CLIENT_ID);
    params.set("response_type", "code");
    params.set("redirect_uri", REDIRECT_URI);
    params.set("scope", "identify");

    const discordURL =
        "https://discord.com/oauth2/authorize?" +
        params.toString();

    res.redirect(discordURL);
});


// ================================
// DISCORD CALLBACK
// ================================

app.get("/auth/discord/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {
        return res.status(400).send("No Discord authorization code.");
    }

    try {

        // Exchange Discord code for access token
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: REDIRECT_URI
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {

            console.error(
                "Discord token error:",
                tokenData
            );

            return res
                .status(500)
                .send("Discord login failed.");

        }


        // Get Discord user
        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        tokenData.token_type +
                        " " +
                        tokenData.access_token
                }
            }
        );

        const user = await userResponse.json();

        if (!userResponse.ok) {

            console.error(
                "Discord user error:",
                user
            );

            return res
                .status(500)
                .send("Could not get Discord user.");

        }


        // ================================
        // SUCCESS PAGE
        // ================================

        const username =
            escapeHtml(user.username);

        res.send(
            "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +

            "<meta charset='UTF-8'>" +

            "<meta name='viewport' " +
            "content='width=device-width, initial-scale=1.0'>" +

            "<title>Cave Tag Login</title>" +

            "<style>" +

            "body {" +
            "margin:0;" +
            "min-height:100vh;" +
            "display:flex;" +
            "align-items:center;" +
            "justify-content:center;" +
            "background:#03070d;" +
            "color:white;" +
            "font-family:Arial,sans-serif;" +
            "text-align:center;" +
            "}" +

            ".card {" +
            "padding:40px;" +
            "width:min(450px,85%);" +
            "border-radius:25px;" +
            "background:#08111c;" +
            "border:1px solid rgba(53,170,255,.2);" +
            "box-shadow:0 20px 70px rgba(0,0,0,.5);" +
            "}" +

            "h1 {" +
            "color:#35aaff;" +
            "}" +

            ".username {" +
            "font-size:24px;" +
            "font-weight:900;" +
            "margin:20px 0;" +
            "}" +

            "a {" +
            "display:inline-block;" +
            "padding:14px 20px;" +
            "border-radius:10px;" +
            "background:#35aaff;" +
            "color:#02070d;" +
            "text-decoration:none;" +
            "font-weight:900;" +
            "}" +

            "</style>" +

            "</head>" +

            "<body>" +

            "<div class='card'>" +

            "<h1>Welcome to Cave Tag!</h1>" +

            "<div class='username'>" +
            username +
            "</div>" +

            "<p>" +
            "You successfully logged in with Discord." +
            "</p>" +

            "<br>" +

            "<a href='" +
            FRONTEND_URL +
            "'>" +
            "Back to Cave Tag" +
            "</a>" +

            "</div>" +

            "</body>" +

            "</html>"
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        res
            .status(500)
            .send("Something went wrong.");

    }

});


// ================================
// SECURITY
// ================================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

    console.log(
        "Cave Tag backend running on port " +
        PORT
    );

});
```
