// WhatsApp sender is currently disabled
exports.sendWhatsApp = async (complaint) => {
    console.log(`[WhatsApp Disabled] Would have sent message for complaint ${complaint.ticketId}`);
    return Promise.resolve();
}; 