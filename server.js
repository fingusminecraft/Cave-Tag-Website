```js
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BETA_ROLE_ID = process.env.DISCORD_BETA_ROLE_ID;

const FRONTEND_URL =
    "https://fingusminecraft.github.io/Cave-Tag-Website/";


// =====================================================
// DISCORD LOGIN
// =====================================================

app.get("/login", (req, res) => {

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: "identify"
    });

    res.redirect(
        "https://discord.com/oauth2/authorize?" +
        params.toString()
    );

});


// =====================================================
// DISCORD CALLBACK
// =====================================================

app.get("/auth/discord/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {

        return res
            .status(400)
            .send("No Discord authorization code.");

    }

    try {

        // -------------------------------------------------
        // Exchange authorization code for access token
        // -------------------------------------------------

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


        const tokenData =
            await tokenResponse.json();


        if (!tokenResponse.ok) {

            console.error(
                "Discord token error:",
                tokenData
            );

            return res
                .status(500)
                .send("Discord login failed.");

        }


        // -------------------------------------------------
        // Get Discord account
        // -------------------------------------------------

        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `${tokenData.token_type} ${tokenData.access_token}`
                }
            }
        );


        const user =
            await userResponse.json();


        if (!userResponse.ok) {

            console.error(
                "Discord user error:",
                user
            );

            return res
                .status(500)
                .send("Could not get your Discord account.");

        }


        console.log(
            `Discord login successful: ${user.username} (${user.id})`
        );


        // -------------------------------------------------
        // Check configuration
        // -------------------------------------------------

        if (!BOT_TOKEN) {

            console.error(
                "DISCORD_BOT_TOKEN is missing."
            );

            return res
                .status(500)
                .send("Discord bot token is not configured.");

        }


        if (!GUILD_ID) {

            console.error(
                "DISCORD_GUILD_ID is missing."
            );

            return res
                .status(500)
                .send("Discord server ID is not configured.");

        }


        if (!BETA_ROLE_ID) {

            console.error(
                "DISCORD_BETA_ROLE_ID is missing."
            );

            return res
                .status(500)
                .send("Beta Tester role ID is not configured.");

        }


        // -------------------------------------------------
        // Give Beta Tester role
        // -------------------------------------------------

        console.log(
            `Attempting to give Beta Tester role to ${user.username}...`
        );


        const roleResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}/roles/${BETA_ROLE_ID}`,
            {
                method: "PUT",

                headers: {
                    Authorization:
                        `Bot ${BOT_TOKEN}`
                }
            }
        );


        if (!roleResponse.ok) {

            const roleError =
                await roleResponse.text();


            console.error(
                "ROLE ASSIGNMENT FAILED:",
                roleResponse.status,
                roleError
            );


            return res.send(`
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Cave Tag - Role Error</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                radial-gradient(
                    circle at top,
                    rgba(53,170,255,.15),
                    transparent 40%
                ),
                #03070d;

            color: white;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            text-align: center;
        }

        .card {
            width: min(500px, 100%);

            padding: 45px 30px;

            border-radius: 25px;

            background: #08111c;

            border:
                1px solid
                rgba(53,170,255,.2);

            box-shadow:
                0 25px 80px
                rgba(0,0,0,.5);
        }

        .icon {
            font-size: 55px;
        }

        h1 {
            color: #35aaff;

            margin:
                15px 0;
        }

        p {
            color: #8293a5;

            line-height: 1.7;
        }

        .warning {
            margin-top: 20px;

            padding: 15px;

            border-radius: 12px;

            background:
                rgba(255,80,80,.08);

            border:
                1px solid
                rgba(255,80,80,.2);

            color: #ff9999;
        }

        a {
            display: inline-block;

            margin-top: 25px;

            padding: 14px 22px;

            border-radius: 10px;

            background: #35aaff;

            color: #02070d;

            text-decoration: none;

            font-weight: 900;
        }

    </style>

</head>

<body>

    <div class="card">

        <div class="icon">
            ⚠️
        </div>

        <h1>
            Login worked!
        </h1>

        <p>
            Welcome,
            ${escapeHtml(user.username)}!
        </p>

        <div class="warning">

            Your Discord login worked,
            but the Beta Tester role could not
            be added.

        </div>

        <p>
            Please make sure the Cave Tag bot is
            in the server, has <strong>Manage Roles</strong>,
            and its role is above the Beta Tester role.
        </p>

        <a href="${FRONTEND_URL}">
            Back to Cave Tag
        </a>

    </div>

</body>

</html>
            `);

        }


        // -------------------------------------------------
        // Success
        // -------------------------------------------------

        console.log(
            `Beta Tester role assigned successfully to ${user.username}`
        );


        res.send(`

<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Cave Tag - Beta Tester</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                radial-gradient(
                    circle at top,
                    rgba(53,170,255,.16),
                    transparent 40%
                ),
                #03070d;

            color: white;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            text-align: center;
        }

        .card {
            width: min(500px, 100%);

            padding: 50px 30px;

            border-radius: 25px;

            background: #08111c;

            border:
                1px solid
                rgba(53,170,255,.25);

            box-shadow:
                0 25px 80px
                rgba(0,0,0,.5),

                0 0 50px
                rgba(53,170,255,.08);
        }

        .icon {
            font-size: 65px;
        }

        h1 {
            color: #35aaff;

            margin:
                15px 0;
        }

        .username {
            font-size: 24px;

            font-weight: 900;

            margin:
                20px 0;
        }

        p {
            color: #8293a5;

            line-height: 1.7;
        }

        .role {
            display: inline-block;

            margin:
                10px 0 15px;

            padding:
                10px 18px;

            border-radius: 999px;

            background:
                rgba(53,170,255,.1);

            border:
                1px solid
                rgba(53,170,255,.3);

            color: #35aaff;

            font-weight: 900;

            letter-spacing: 1px;
        }

        a {
            display: inline-block;

            margin-top: 25px;

            padding: 14px 22px;

            border-radius: 10px;

            background: #35aaff;

            color: #02070d;

            text-decoration: none;

            font-weight: 900;
        }

    </style>

</head>

<body>

    <div class="card">

        <div class="icon">
            🧪
        </div>

        <h1>
            Beta Tester Unlocked!
        </h1>

        <div class="username">
            ${escapeHtml(user.username)}
        </div>

        <div class="role">
            ✓ BETA TESTER
        </div>

        <p>
            Your Discord account has been verified
            and you've been given the Cave Tag
            Beta Tester role!
        </p>

        <a href="${FRONTEND_URL}">
            Return to Cave Tag
        </a>

    </div>

</body>

</html>

        `);


    } catch (error) {

        console.error(
            "Discord authentication error:",
            error
        );

        res
            .status(500)
            .send(
                "Something went wrong during Discord login."
            );

    }

});


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(
        `Cave Tag backend running on port ${PORT}`
    );

});
```
