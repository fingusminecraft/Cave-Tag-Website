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


// =========================================================
// DISCORD LOGIN
// =========================================================

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


// =========================================================
// DISCORD CALLBACK
// =========================================================

app.get("/auth/discord/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {
        return res
            .status(400)
            .send("No Discord authorization code.");
    }

    try {

        // -------------------------------------------------
        // Get Discord access token
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
                "Token error:",
                tokenData
            );

            return res
                .status(500)
                .send("Discord login failed.");

        }


        // -------------------------------------------------
        // Get Discord user
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
                "User error:",
                user
            );

            return res
                .status(500)
                .send("Could not get Discord user.");

        }


        console.log(
            `Discord login: ${user.username} (${user.id})`
        );


        // -------------------------------------------------
        // Give Beta Tester role
        // -------------------------------------------------

        if (
            BOT_TOKEN &&
            GUILD_ID &&
            BETA_ROLE_ID
        ) {

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

                        <title>Cave Tag</title>

                        <style>

                            body {
                                margin: 0;
                                min-height: 100vh;

                                display: flex;
                                align-items: center;
                                justify-content: center;

                                background: #03070d;
                                color: white;

                                font-family: Arial, sans-serif;
                                text-align: center;
                            }

                            .card {
                                padding: 40px;

                                width: min(450px, 85%);

                                border-radius: 25px;

                                background: #08111c;

                                border:
                                    1px solid
                                    rgba(53,170,255,.2);

                                box-shadow:
                                    0 20px 70px
                                    rgba(0,0,0,.5);
                            }

                            h1 {
                                color: #35aaff;
                            }

                            .error {
                                color: #ff6b6b;
                                line-height: 1.6;
                            }

                            a {
                                display: inline-block;

                                margin-top: 20px;

                                padding: 14px 20px;

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

                            <h1>
                                Login successful!
                            </h1>

                            <p>
                                Welcome,
                                ${escapeHtml(user.username)}!
                            </p>

                            <p class="error">
                                Your Beta Tester role could not
                                be assigned.
                            </p>

                            <p>
                                Please make sure the Cave Tag bot
                                is in the Discord server and has
                                permission to manage the Beta Tester
                                role.
                            </p>

                            <a href="${FRONTEND_URL}">
                                Back to Cave Tag
                            </a>

                        </div>

                    </body>

                    </html>
                `);

            }


            console.log(
                `Beta Tester role assigned to ${user.username}`
            );

        } else {

            console.error(
                "Missing role environment variables."
            );

            return res
                .status(500)
                .send(
                    "Beta Tester role system is not configured."
                );

        }


        // -------------------------------------------------
        // Success page
        // -------------------------------------------------

        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <title>Cave Tag Beta Tester</title>

                <style>

                    body {
                        margin: 0;
                        min-height: 100vh;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        background: #03070d;

                        color: white;

                        font-family: Arial, sans-serif;

                        text-align: center;
                    }

                    .card {
                        padding: 45px;

                        width: min(450px, 85%);

                        border-radius: 25px;

                        background: #08111c;

                        border:
                            1px solid
                            rgba(53,170,255,.25);

                        box-shadow:
                            0 20px 70px
                            rgba(0,0,0,.5),
                            0 0 50px
                            rgba(53,170,255,.08);
                    }

                    .icon {
                        font-size: 55px;
                    }

                    h1 {
                        color: #35aaff;
                    }

                    .username {
                        font-size: 24px;

                        font-weight: 900;

                        margin: 20px 0;
                    }

                    .role {
                        display: inline-block;

                        padding: 10px 15px;

                        border-radius: 999px;

                        background:
                            rgba(53,170,255,.1);

                        border:
                            1px solid
                            rgba(53,170,255,.3);

                        color: #35aaff;

                        font-weight: 900;
                    }

                    a {
                        display: inline-block;

                        margin-top: 25px;

                        padding: 14px 20px;

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
                        You're a Beta Tester!
                    </h1>

                    <div class="username">
                        ${escapeHtml(user.username)}
                    </div>

                    <p>
                        Discord login successful.
                    </p>

                    <div class="role">
                        ✓ BETA TESTER
                    </div>

                    <p>
                        Your Beta Tester role has been
                        successfully added to the Cave Tag
                        Discord server.
                    </p>

                    <a href="${FRONTEND_URL}">
                        Back to Cave Tag
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


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =========================================================
// START SERVER
// =========================================================

app.listen(PORT, () => {

    console.log(
        `Cave Tag backend running on port ${PORT}`
    );

});
```
