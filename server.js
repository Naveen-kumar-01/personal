const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// =====================================
// MIDDLEWARE
// =====================================

app.use(express.json());

app.use(express.static("public"));

// =====================================
// REAL TIME FETCH ROUTE
// =====================================

app.get("/fetch-user-stream", async (req, res) => {

    let browser;

    const rollNo = req.query.rollNo;

    // SSE HEADERS

    res.setHeader(
        "Content-Type",
        "text/event-stream"
    );

    res.setHeader(
        "Cache-Control",
        "no-cache"
    );

    res.setHeader(
        "Connection",
        "keep-alive"
    );

    // SEND FUNCTION

    const send = (progress) => {

        res.write(

`data: ${JSON.stringify({

    progress

})}\n\n`

        );
    };

    try {

        if (!rollNo) {

            send(0);

            return res.end();
        }

        // =====================================
        // START BROWSER
        // =====================================

        send(5);

        browser = await puppeteer.launch({

            headless: true,

            executablePath: puppeteer.executablePath(),

            args: [

                "--no-sandbox",

                "--disable-setuid-sandbox",

                "--disable-dev-shm-usage",

                "--disable-accelerated-2d-canvas",

                "--disable-gpu",

                "--window-size=1920x1080",

                "--single-process",

                "--no-zygote"

            ]

        });

        const page = await browser.newPage();

        // =====================================
        // USER AGENT
        // =====================================

        send(15);

        await page.setUserAgent(

            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"

        );

        // =====================================
        // OPEN LOGIN PAGE
        // =====================================

        send(25);

        await page.goto(

            "https://gjuopac.ltsinformatics.com/cgi-bin/koha/opac-user.pl",

            {
                waitUntil: "networkidle2",
                timeout: 120000
            }
        );

        // =====================================
        // WAIT LOGIN FORM
        // =====================================

        send(40);

        await page.waitForSelector(

            "#userid",

            {
                visible: true,
                timeout: 120000
            }
        );

        // =====================================
        // ENTER DETAILS
        // =====================================

        send(50);

        await page.$eval(

            "#userid",

            el => el.value = ""

        );

        await page.$eval(

            "#password",

            el => el.value = ""

        );

        await page.type(

            "#userid",

            rollNo.toString(),

            {
                delay: 50
            }
        );

        await page.type(

            "#password",

            rollNo.toString(),

            {
                delay: 50
            }
        );

        // =====================================
        // LOGIN
        // =====================================

        send(60);

        await page.focus("#password");

        await page.keyboard.press("Enter");

        // =====================================
        // WAIT AFTER LOGIN
        // =====================================

        await new Promise(resolve =>

            setTimeout(resolve, 8000)

        );

        // =====================================
        // OPEN DETAILS PAGE
        // =====================================

        send(75);

        await page.goto(

            "https://gjuopac.ltsinformatics.com/cgi-bin/koha/opac-memberentry.pl",

            {
                waitUntil: "networkidle2",
                timeout: 120000
            }
        );

        // =====================================
        // WAIT DETAILS
        // =====================================

        send(85);

        await page.waitForSelector(

            "#borrower_surname",

            {
                visible: true,
                timeout: 30000
            }
        );

        // =====================================
        // FETCH DATA
        // =====================================

        const data = await page.evaluate(() => {

            return {

                name:

                    document.querySelector(
                        "#borrower_surname"
                    )?.value || "",

                email:

                    document.querySelector(
                        "#borrower_email"
                    )?.value || "",

                dob:

                    document.querySelector(
                        "#borrower_dateofbirth"
                    )?.value || "",

                phone:

                    document.querySelector(
                        "#borrower_phone"
                    )?.value || "",

                address:

                    document.querySelector(
                        "#borrower_address"
                    )?.value || ""
            };
        });

        // =====================================
        // COMPLETE
        // =====================================

        send(100);

        // FINAL EVENT

        res.write(

`event: done
data: ${JSON.stringify({

    success: true,

    data: {

        rollNo,

        ...data
    }

})}\n\n`

        );

        // =====================================
        // CLOSE BROWSER
        // =====================================

        await browser.close();

        res.end();

    } catch (err) {

        console.log("FULL ERROR =>", err);

        if (browser) {

            await browser.close();
        }

        // ERROR EVENT

        res.write(

`event: error
data: ${JSON.stringify({

    success: false,

    error: "Server Error"

})}\n\n`

        );

        res.end();
    }

});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`

====================================
SERVER RUNNING
====================================

http://localhost:${PORT}

====================================

    `);

});
