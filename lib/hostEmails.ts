export const HOST_EMAILS = [
    "host1@gmail.com",
    "gkrgobinda9268@gmail.com",
    "kumarg446688@gmail.com",
];

export const isHostEmail = (email: string): boolean =>
    HOST_EMAILS.includes(email.toLowerCase().trim());