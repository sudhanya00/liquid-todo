// Generate witty loading messages based on user input
export function getLoadingMessage(userInput: string): string {
    const input = userInput.toLowerCase();

    // Task-specific messages
    if (input.includes('meeting') || input.includes('call')) {
        return "Penciling you in... ✏️";
    }
    if (input.includes('buy') || input.includes('shop') || input.includes('get')) {
        return "Adding to cart... 🛒";
    }
    if (input.includes('workout') || input.includes('gym') || input.includes('exercise')) {
        return "Flexing my neurons... 💪";
    }
    if (input.includes('email') || input.includes('message') || input.includes('reply')) {
        return "Composing... 📧";
    }
    if (input.includes('code') || input.includes('debug') || input.includes('fix')) {
        return "Compiling thoughts... 💻";
    }
    if (input.includes('read') || input.includes('book')) {
        return "Bookmarking this... 📚";
    }
    if (input.includes('clean') || input.includes('organize')) {
        return "Tidying up... 🧹";
    }
    if (input.includes('cook') || input.includes('meal') || input.includes('dinner')) {
        return "Prepping ingredients... 🍳";
    }

    // Generic witty messages
    const genericMessages = [
        "Connecting the dots... 🔮",
        "Brewing something good... ☕",
        "Putting pieces together... 🧩",
        "Crafting your plan... ✨",
        "Working my magic... 🪄",
        "Sorting this out... 🎯",
        "Getting things in order... 📋",
        "Making sense of it all... 🤔"
    ];

    return genericMessages[Math.floor(Math.random() * genericMessages.length)];
}
