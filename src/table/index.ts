import Table from "cli-table3";

export const generateTable = (mneumonic: string) => {
  const split = mneumonic.split(" ");
  const table = new Table();
  for (let i = 0; i < split.length; i += 4) {
    table.push(split.slice(i, i + 4));
  }
  return table.toString();
};

export const pubpritable = (publicKey: string, privateKey: string) => {
  const table = new Table({
    colWidths: [14, (process.stdout.columns || 100) - 18],
    wordWrap: true,
    wrapOnWordBoundary: false,
  });
  table.push(["Public Key", publicKey], ["Private Key", privateKey]);
  return table.toString();
};
