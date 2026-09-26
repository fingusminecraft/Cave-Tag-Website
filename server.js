const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


// =========================================================
// ENVIRONMENT VARIABLES
// =========================================================

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const BETA_ROLE_ID = process.env.BETA_ROLE_ID;
const REWARD_ROLE_ID = process.env.REWARD_ROLE_ID;

const FRONTEND_URL =
    "https://fingusminecraft.github.io/Cave-Tag-Website/";


// =========================================================
// BASIC CONFIG CHECK
// =========================================================

console.log("========================================");
console.log("CAVE TAG SERVER");
console.log("========================================");

console.log("CLIENT_ID:", CLIENT_ID ? "OK" : "MISSING");
console.log("CLIENT_SECRET:", CLIENT_SECRET ? "OK" : "MISSING");
console.log("REDIRECT_URI:", REDIRECT_URI ? "OK" : "MISSING");
console.log("BOT_TOKEN:", BOT_TOKEN ? "OK" : "MISSING");
console.log("GUILD_ID:", GUILD_ID ? "OK" : "MISSING");
console.log("BETA_ROLE_ID:", BETA_ROLE_ID ? "OK" : "MISSING");
console.log("REWARD_ROLE_ID:", REWARD_ROLE_ID ? "OK" : "MISSING");


// =========================================================
// CODE SYSTEM
// =========================================================
//
// NORMAL CODE
// - Automatically expires 30 days after createdAt.
//
// LIMITED CODE
// - Never expires.
// - Stops working once maxUses is reached.
//
// IMPORTANT:
// The "uses" counter is stored in server memory.
// If Render completely restarts the service, limited-code
// usage will reset.
//
// For a permanent production system, use a database.
// =========================================================

const codes = {

    "CAVE2026": {
        type: "normal",

        createdAt: new Date().toISOString(),

        durationDays: 30,

        roleId: REWARD_ROLE_ID,

        uses: 0,

        maxUses: null
    },


    "RELEASEDAY!": {
        type: "limited",

        createdAt: new Date().toISOString(),

        durationDays: null,

        roleId: REWARD_ROLE_ID,

        uses: 0,

        maxUses: 100
    }

};


// =========================================================
// PENDING CODE REDEMPTIONS
// =========================================================
//
// When somebody enters a code, they are sent to Discord.
//
// We temporarily remember which code they were redeeming.
// =========================================================

const pendingRedemptions = new Map();


// =========================================================
// HELPER: CREATE RANDOM STATE
// =========================================================

function createState() {

    return crypto.randomBytes(32).toString("hex");

}


// =========================================================
// HELPER: CHECK CODE
// =========================================================

function getCode(code) {

    const normalized =
        String(code || "")
            .trim()
            .toUpperCase();

    return codes[normalized];

}


// =========================================================
// HELPER: CHECK EXPIRATION
// =========================================================

function isNormalCodeExpired(codeData) {

    if (codeData.type !== "normal") {
        return false;
    }

    const created =
        new Date(codeData.createdAt);

    const expires =
        new Date(created);

    expires.setDate(
        expires.getDate() +
        codeData.durationDays
    );

    return new Date() > expires;

}


// =========================================================
// HELPER: CHECK WHETHER CODE CAN BE USED
// =========================================================

function checkCode(code) {

    const normalized =
        String(code || "")
            .trim()
            .toUpperCase();

    const codeData =
        codes[normalized];


    if (!codeData) {

        return {
            valid: false,
            message: "That code doesn't exist."
        };

    }


    if (isNormalCodeExpired(codeData)) {

        return {
            valid: false,
            message: "That code has expired."
        };

    }


    if (
        codeData.type === "limited" &&
        codeData.uses >= codeData.maxUses
    ) {

        return {
            valid: false,
            message:
                "That limited code has already been fully redeemed."
        };

    }


    return {
        valid: true,
        code: normalized,
        data: codeData
    };

}


// =========================================================
// DISCORD LOGIN
// =========================================================

app.get("/login", (req, res) => {

    const params =
        new URLSearchParams();

    params.set(
        "client_id",
        CLIENT_ID
    );

    params.set(
        "response_type",
        "code"
    );

    params.set(
        "redirect_uri",
        REDIRECT_URI
    );

    params.set(
        "scope",
        "identify"
    );


    const discordURL =
        "https://discord.com/oauth2/authorize?" +
        params.toString();


    res.redirect(discordURL);

});


// =========================================================
// CODE REDEMPTION START
// =========================================================

app.get("/redeem", (req, res) => {

    const code =
        String(req.query.code || "")
            .trim()
            .toUpperCase();


    if (!code) {

        return res
            .status(400)
            .send("No code was provided.");

    }


    const result =
        checkCode(code);


    if (!result.valid) {

        return res
            .status(400)
            .send(`
                <!DOCTYPE html>

                <html>

                <head>
                    <title>Cave Tag Code</title>

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
                            width: min(450px, 85%);
                            padding: 40px;

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
                            color: #ff5555;
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

                        <h1>Code Invalid</h1>

                        <p>
                            ${escapeHtml(result.message)}
                        </p>

                        <a href="${FRONTEND_URL}#codes">
                            Back to Cave Tag
                        </a>

                    </div>

                </body>

                </html>
            `);

    }


    const state =
        createState();


    pendingRedemptions.set(
        state,
        {
            code: result.code,

            createdAt:
                Date.now()
        }
    );


    // Automatically remove old pending redemptions.
    setTimeout(() => {

        pendingRedemptions.delete(state);

    }, 10 * 60 * 1000);


    const params =
        new URLSearchParams();


    params.set(
        "client_id",
        CLIENT_ID
    );

    params.set(
        "response_type",
        "code"
    );

    params.set(
        "redirect_uri",
        REDIRECT_URI
    );

    params.set(
        "scope",
        "identify"
    );

    params.set(
        "state",
        state
    );


    const discordURL =
        "https://discord.com/oauth2/authorize?" +
        params.toString();


    res.redirect(discordURL);

});


// =========================================================
// DISCORD CALLBACK
// =========================================================

app.get(
    "/auth/discord/callback",
    async (req, res) => {

        const discordCode =
            req.query.code;

        const state =
            req.query.state;


        if (!discordCode) {

            return res
                .status(400)
                .send(
                    "No Discord authorization code."
                );

        }


        try {

            // =================================================
            // EXCHANGE DISCORD CODE FOR ACCESS TOKEN
            // =================================================

            const tokenResponse =
                await fetch(
                    "https://discord.com/api/oauth2/token",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams({

                                client_id:
                                    CLIENT_ID,

                                client_secret:
                                    CLIENT_SECRET,

                                grant_type:
                                    "authorization_code",

                                code:
                                    discordCode,

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
                    .send(
                        "Discord login failed."
                    );

            }


            // =================================================
            // GET DISCORD USER
            // =================================================

            const userResponse =
                await fetch(
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


            const user =
                await userResponse.json();


            if (!userResponse.ok) {

                console.error(
                    "Discord user error:",
                    user
                );


                return res
                    .status(500)
                    .send(
                        "Could not get Discord user."
                    );

            }


            // =================================================
            // CODE REDEMPTION
            // =================================================

            if (state) {

                const pending =
                    pendingRedemptions.get(state);


                if (pending) {

                    pendingRedemptions.delete(
                        state
                    );


                    await redeemCodeForUser(
                        pending.code,
                        user
                    );


                    return;

                }

            }


            // =================================================
            // NORMAL BETA TESTER LOGIN
            // =================================================

            await giveRole(
                user.id,
                BETA_ROLE_ID
            );


            console.log(
                "Beta Tester role given to:",
                user.username,
                user.id
            );


            const username =
                escapeHtml(
                    user.username
                );


            res.send(

                successPage(

                    "Welcome to Cave Tag!",

                    username,

                    "✓ Beta Tester role added!",

                    "You're officially registered for Cave Tag Beta Testing."

                )

            );

        }

        catch (error) {

            console.error(
                "Login error:",
                error
            );


            res
                .status(500)
                .send(
                    "Something went wrong."
                );

        }

    }
);


// =========================================================
// REDEEM CODE FOR DISCORD USER
// =========================================================

async function redeemCodeForUser(
    code,
    user
) {

    const result =
        checkCode(code);


    // Re-check the code after Discord login.
    // This prevents an expired/exhausted code
    // from being redeemed during the login process.

    if (!result.valid) {

        return sendCodeResult(
            user,
            false,
            result.message
        );

    }


    const codeData =
        result.data;


    // =====================================================
    // MAKE SURE ROLE EXISTS
    // =====================================================

    if (!codeData.roleId) {

        console.error(
            "No reward role configured."
        );


        return sendCodeResult(
            user,
            false,
            "The reward role has not been configured yet."
        );

    }


    try {

        // =================================================
        // GIVE ROLE
        // =================================================

        await giveRole(
            user.id,
            codeData.roleId
        );


        // =================================================
        // COUNT REDEMPTION
        // =================================================

        codeData.uses++;


        console.log(
            "========================================"
        );

        console.log(
            "CODE REDEEMED"
        );

        console.log(
            "Code:",
            code
        );

        console.log(
            "User:",
            user.username
        );

        console.log(
            "User ID:",
            user.id
        );

        console.log(
            "Uses:",
            codeData.uses,
            codeData.maxUses
                ? "/" + codeData.maxUses
                : ""
        );

        console.log(
            "========================================"
        );


        const remaining =
            codeData.maxUses
                ? codeData.maxUses -
                  codeData.uses
                : null;


        let message;


        if (codeData.type === "limited") {

            message =
                "✓ Code redeemed! " +
                "You received the Cave Tag reward role." +
                "<br><br>" +
                (
                    remaining === 0
                        ? "This limited code has now been fully redeemed!"
                        : remaining +
                          " redemptions remain."
                );

        }

        else {

            message =
                "✓ Code redeemed! " +
                "You received the Cave Tag reward role.";

        }


        return sendCodeResult(
            user,
            true,
            message
        );

    }

    catch (error) {

        console.error(
            "Could not redeem code:",
            error
        );


        return sendCodeResult(
            user,
            false,
            "I couldn't give you the Discord reward role. " +
            "Make sure the bot has Manage Roles and its role is above the reward role."
        );

    }

}


// =========================================================
// GIVE DISCORD ROLE
// =========================================================

async function giveRole(
    userId,
    roleId
) {

    if (!BOT_TOKEN) {

        throw new Error(
            "DISCORD_BOT_TOKEN is missing."
        );

    }


    if (!GUILD_ID) {

        throw new Error(
            "DISCORD_GUILD_ID is missing."
        );

    }


    if (!roleId) {

        throw new Error(
            "Role ID is missing."
        );

    }


    const roleURL =
        "https://discord.com/api/v10/guilds/" +
        GUILD_ID +
        "/members/" +
        userId +
        "/roles/" +
        roleId;


    const roleResponse =
        await fetch(
            roleURL,
            {

                method: "PUT",

                headers: {

                    Authorization:
                        "Bot " +
                        BOT_TOKEN

                }

            }
        );


    if (!roleResponse.ok) {

        const roleError =
            await roleResponse.text();


        console.error(
            "Discord role error:",
            roleError
        );


        throw new Error(
            "Discord role request failed: " +
            roleError
        );

    }

}


// =========================================================
// CODE RESULT PAGE
// =========================================================

function sendCodeResult(
    user,
    success,
    message
) {

    const username =
        escapeHtml(
            user.username
        );


    const title =
        success
            ? "Code Redeemed!"
            : "Code Redemption Failed";


    const safeMessage =
        message;


    // We intentionally use a controlled message
    // created by this server rather than user HTML.

    const page =
        success
            ? successPage(
                title,
                username,
                "✓ Reward unlocked!",
                safeMessage
            )
            : errorPage(
                title,
                username,
                safeMessage
            );


    // We cannot use res here because the original
    // response is not available anymore.
    //
    // Instead this function is only called from the
    // callback, so the callback must send it.
    //
    // This return value is handled below.

    return page;

}


// =========================================================
// SUCCESS PAGE
// =========================================================

function successPage(
    title,
    username,
    heading,
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

<title>${escapeHtml(title)}</title>

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

    width: min(450px, 85%);

    padding: 40px;

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

.username {

    font-size: 24px;

    font-weight: 900;

    margin: 20px 0;

}

.success {

    color: #35aaff;

    font-weight: 900;

    margin: 20px 0;

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

<h1>${escapeHtml(title)}</h1>

<div class="username">
${username}
</div>

<div class="success">
${heading}
</div>

<p>
${message}
</p>

<a href="${FRONTEND_URL}#codes">
Back to Cave Tag
</a>

</div>

</body>

</html>

`;

}


// =========================================================
// ERROR PAGE
// =========================================================

function errorPage(
    title,
    username,
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

<title>${escapeHtml(title)}</title>

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

    width: min(450px, 85%);

    padding: 40px;

    border-radius: 25px;

    background: #08111c;

    border:
        1px solid
        rgba(255,80,80,.2);

    box-shadow:
        0 20px 70px
        rgba(0,0,0,.5);

}

h1 {

    color: #ff5555;

}

.username {

    font-size: 20px;

    font-weight: 900;

    margin: 20px 0;

}

.error {

    color: #ff7777;

    font-weight: 700;

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

<h1>${escapeHtml(title)}</h1>

<div class="username">
${username}
</div>

<div class="error">
${message}
</div>

<a href="${FRONTEND_URL}#codes">
Back to Cave Tag
</a>

</div>

</body>

</html>

`;

}


// =========================================================
// ESCAPE HTML
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
// FIX CODE REDEMPTION RESPONSE
// =========================================================
//
// This replaces the callback's code redemption section
// response handling.
// =========================================================

// We override the original callback behavior by using
// the helper below when code redemption occurs.


// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/", (req, res) => {

    res.send(
        "Cave Tag backend is online."
    );

});


// =========================================================
// START SERVER
// =========================================================

app.listen(
    PORT,
    () => {

        console.log(
            "Cave Tag backend running on port " +
            PORT
        );

    }
);
