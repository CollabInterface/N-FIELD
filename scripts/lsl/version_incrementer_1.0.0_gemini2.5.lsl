// SCRIPT METADATA & AI INSTRUCTIONS
// ---------------------------------
// Purpose: Displays the script version and the AI model that last modified it
//          as hovertext above the prim containing this script. Could be usable as a snippet for the user.
//
// AI Update Instructions:
// 1. Read the request specifying the type of change (e.g., bug fix, new feature).
// 2. Locate the 'string version = "x.y.z";' line below.
// 3. Increment the version number according to Semantic Versioning (Major.Minor.Patch):
//    - Increment MAJOR (x) for incompatible changes. Reset Minor and Patch to 0.
//    - Increment MINOR (y) for adding backward-compatible functionality. Reset Patch to 0.
//    - Increment PATCH (z) for backward-compatible bug fixes.
// 4. Update the 'string last_modified_by_ai = "...";' line below with your specific AI model name.
// 5. Ensure both the version string and the AI model name string remain enclosed in double quotes "".
// 6. Review your changes carefully before outputting the complete, modified script content.
// ---------------------------------

// --- Configuration Variables ---
string version = "1.0.0"; // Current script version (x.y.z format)
string last_modified_by_ai = "Initial Draft (Gemini)"; // AI model that performed the last update

vector hover_text_color = <1.0, 1.0, 1.0>; // Hovertext color (RGB, 0.0 to 1.0) - White
float hover_text_alpha = 1.0; // Hovertext transparency (0.0 = invisible, 1.0 = opaque)

// --- Main Script Logic ---
default
{
    state_entry()
    {
        // Combine version and AI info into the text to display
        string display_text = "Version: " + version + "\nAI Model: " + last_modified_by_ai;

        // Set the hovertext
        llSetText(display_text, hover_text_color, hover_text_alpha);
    }

    // Optional: Add other functionalities below as needed in future versions.
    // Example: Touch to report version in chat
    // touch_start(integer total_number)
    // {
    //     llOwnerSay("This is script version " + version + ", last modified by " + last_modified_by_ai + ".");
    // }
}