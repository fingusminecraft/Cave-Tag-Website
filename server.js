const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const REDIRECT_URI =
    process.env.DISCORD_REDIRECT_URI;

const FRONTEND_URL =
    "https://fingusminecraft.github.io/Cave-Tag-Website/";

const BETA_ROLE_NAME = "Beta Tester";


// =========================================================
// DISCORD LOGIN
// =========================================================

app.get("/login", (req, res) => {

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,

        // We need identify so we know who logged in.
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

        // =================================================
        // GET DISCORD ACCESS TOKEN
        // =================================================

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({

                    client_id:
                        CLIENT_ID,

                    client_secret:
                        CLIENT_SECRET,

                    grant_type:
                        "authorization_code",

                    code:
                        code,

                    redirect_uri:
                        REDIRECT_URI

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


        // =================================================
        // GET DISCORD USER
        // =================================================

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
                .send("Could not get Discord user.");

        }


        console.log(
            `Discord login: ${user.username} (${user.id})`
        );


        // =================================================
        // CHECK CONFIGURATION
        // =================================================

        if (
            !DISCORD_BOT_TOKEN ||
            !GUILD_ID
        ) {

            console.error(
                "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID."
            );

            return res.send(
                createPage(
                    user,
                    "⚠️ Beta Tester role could not be assigned.",
                    "The server is missing its Discord bot configuration."
                )
            );

        }


        // =================================================
        // CHECK IF USER IS IN THE DISCORD SERVER
        // =================================================

        const memberResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}`,
            {
                headers: {

                    Authorization:
                        `Bot ${DISCORD_BOT_TOKEN}`

                }
            }
        );


        if (!memberResponse.ok) {

            console.error(
                "Member lookup failed:",
                memberResponse.status
            );

            return res.send(
                createPage(
                    user,
                    "⚠️ Join the Cave Tag Discord first!",
                    "You need to be a member of the Cave Tag Discord server before you can receive the Beta Tester role."
                )
            );

        }


        // =================================================
        // GET ALL SERVER ROLES
        // =================================================

        const rolesResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
            {
                headers: {

                    Authorization:
                        `Bot ${DISCORD_BOT_TOKEN}`

                }
            }
        );


        const roles =
            await rolesResponse.json();


        if (!rolesResponse.ok) {

            console.error(
                "Could not get Discord roles:",
                roles
            );

            return res.send(
                createPage(
                    user,
                    "⚠️ Could not find the Beta Tester role.",
                    "The Discord bot could not retrieve the server roles."
                )
            );

        }


        // =================================================
        // FIND BETA TESTER ROLE
        // =================================================

        const betaRole =
            roles.find(
                role =>
                    role.name.toLowerCase() ===
                    BETA_ROLE_NAME.toLowerCase()
            );


        if (!betaRole) {

            console.error(
                `Role "${BETA_ROLE_NAME}" was not found.`
            );

            return res.send(
                createPage(
                    user,
                    "⚠️ Beta Tester role not found.",
                    `Make sure your Discord server has a role named "${BETA_ROLE_NAME}".`
                )
            );

        }


        console.log(
            `Found Beta Tester role: ${betaRole.id}`
        );


        // =================================================
        // GIVE USER THE ROLE
        // =================================================

        const roleResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}/roles/${betaRole.id}`,
            {
                method: "PUT",

                headers: {

                    Authorization:
                        `Bot ${DISCORD_BOT_TOKEN}`

                }
            }
        );


        // =================================================
        // ROLE SUCCESS
        // =================================================

        if (
            roleResponse.ok ||
            roleResponse.status === 204
        ) {

            console.log(
                `✅ Gave ${user.username} the Beta Tester role.`
            );

            return res.send(
                createPage(
                    user,
                    "🎉 Beta Tester role added!",
                    "You're now registered as a Cave Tag Beta Tester. Check the Discord server for more information."
                )
            );

        }


        // =================================================
        // ROLE FAILED
        // =================================================

        const roleError =
            await roleResponse.text();

        console.error(
            "Role assignment failed:",
            roleResponse.status,
            roleError
        );


        return res.send(
            createPage(
                user,
                "⚠️ Couldn't assign the role.",
                "The Discord bot may not have permission to manage the Beta Tester role."
            )
        );


    } catch (error) {

        console.error(
            "Discord login error:",
            error
        );

        return res
            .status(500)
            .send("Something went wrong.");

    }

});


// =========================================================
// LOGIN PAGE
// =========================================================

function createPage(
    user,
    title,
    message
) {

    return `
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Cave Tag Login</title>

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

            padding: 20px;

        }


        .card {

            width:
                min(480px, 100%);

            padding: 45px 30px;

            border-radius: 25px;

            background:
                linear-gradient(
                    145deg,
                    #0c1825,
                    #050a10
                );

            border:
                1px solid
                rgba(53,170,255,.2);

            box-shadow:
                0 30px 90px
                rgba(0,0,0,.6);

        }


        .icon {

            font-size: 55px;

            margin-bottom: 15px;

        }


        h1 {

            color:
                #35aaff;

            font-size: 30px;

            margin-bottom: 20px;

        }


        .username {

            display: inline-block;

            padding: 10px 15px;

            border-radius: 10px;

            background:
                rgba(53,170,255,.08);

            border:
                1px solid
                rgba(53,170,255,.15);

            color:
                #8ed2ff;

            font-size: 20px;

            font-weight: 900;

            margin-bottom: 20px;

        }


        p {

            color:
                #8090a1;

            line-height: 1.7;

        }


        .back {

            display: inline-block;

            margin-top: 25px;

            padding: 14px 22px;

            border-radius: 10px;

            background:
                #35aaff;

            color:
                #02070d;

            text-decoration: none;

            font-weight: 900;

            transition: .2s;

        }


        .back:hover {

            transform:
                translateY(-3px);

            box-shadow:
                0 10px 30px
                rgba(53,170,255,.3);

        }

    </style>

</head>


<body>

    <div class="card">

        <div class="icon">
            🦍
        </div>

        <h1>
            ${escapeHtml(title)}
        </h1>

        <div class="username">
            ${escapeHtml(user.username)}
        </div>

        <p>
            ${escapeHtml(message)}
        </p>

        <a
            class="back"
            href="${FRONTEND_URL}"
        >
            Back to Cave Tag
        </a>

    </div>

</body>

</html>
`;

}


// =========================================================
// HTML ESCAPING
// =========================================================

function escapeHtml(text) {

    return String(text)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// =========================================================
// START SERVER
// =========================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Cave Tag backend running on port ${PORT}`
        );

    }
);
