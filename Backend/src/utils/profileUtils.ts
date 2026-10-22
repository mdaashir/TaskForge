export function generateProfileImage(inputName: string): string {
    const colors = [
        { foreground: '0B60B0', background: '9dc9f2' },
        { foreground: '6C22A6', background: 'd7a3ff' },
        { foreground: 'BF3131', background: 'f09999' },
        { foreground: '508D69', background: 'a1d1b5' },
        { foreground: 'D9822B', background: 'f5c78f' },
        { foreground: '2F5597', background: 'a2b9e0' },
        { foreground: '7E3F98', background: 'c9a1d8' },
        { foreground: 'B6412D', background: 'e7a399' },
        { foreground: '3A7D44', background: 'a7c08c' },
        { foreground: 'C9A73F', background: 'f1e5a2' },
        { foreground: '236192', background: '7f9ec4' },
        { foreground: '9959A4', background: 'd9b3d9' },
    ];

    const names = inputName
        .split(' ')
        .map((word) => word.trim())
        .filter(Boolean);
    const color =
        colors[
            names.length ? names.length % colors.length : Math.floor(Math.random() * colors.length)
        ];
    const initials =
        names.length === 1
            ? names[0][0].toUpperCase()
            : names.length > 1
              ? (names[0][0] + names[1][0]).toUpperCase()
              : 'TF';

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 250 250">
      <circle cx="125" cy="125" r="125" fill="#${color.background}" />
      <text x="50%" y="54%" fill="#${color.foreground}" font-size="110" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">${initials}</text>
    </svg>
  `;
}
