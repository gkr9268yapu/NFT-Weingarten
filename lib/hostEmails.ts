export const HOST_EMAILS = [
    "host1@gmail.com",
    "graut0053@gmail.com",
    "kumarg446688@gmail.com",
];

export const isHostEmail = (email: string): boolean =>
    HOST_EMAILS.includes(email.toLowerCase().trim());