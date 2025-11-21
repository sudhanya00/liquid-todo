import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testDateParsing() {
    const text = "Finish the report by Saturday";
    console.log(`Testing input: "${text}"`);

    try {
        const response = await fetch("http://localhost:3000/api/parse-task", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: text,
                tasks: []
            }),
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log("AI Response:", JSON.stringify(data, null, 2));

        // Basic validation
        if (data.action === "create" && data.newTask && data.newTask.dueDate) {
            console.log(`✅ SUCCESS: Resolved due date to ${data.newTask.dueDate}`);
        } else {
            console.log("❌ FAILURE: Did not resolve a due date.");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testDateParsing();
