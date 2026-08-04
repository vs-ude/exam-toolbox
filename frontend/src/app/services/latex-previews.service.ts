import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export type LatexPreview = {
  name: string;
  latex: string;
  previewImageUrl: string;
};

@Injectable({
  providedIn: 'root',
})
export class LatexPreviewsService {
  private previews: LatexPreview[] = [
    {
      name: 'Chord Routing Table',
      previewImageUrl: `${environment.publicPath}complexTable.jpg`,
      latex: `\\begin{center}
\\begin{tabular}{|l|l|l|l|l|l|}
\\hline
\\multicolumn{6}{|l|}{Table} \\\\ \\hline
% Line1
\\scriptsize$A_{11}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{12}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{13}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{14}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{15}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{16}$ \\lineloesung{~~~~~}{4242} \\\\ \\hline
% Line2
\\scriptsize$A_{21}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{22}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{23}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{24}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{25}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{26}$ \\lineloesung{~~~~~}{4242} \\\\ \\hline
% Line3
\\scriptsize$A_{31}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{32}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{33}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{34}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{35}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{36}$ \\lineloesung{~~~~~}{4242} \\\\ \\hline
% Line4
\\scriptsize$A_{41}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{42}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{43}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{44}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{45}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$A_{46}$ \\lineloesung{~~~~~}{4242} \\\\ \\hline
\\multicolumn{6}{|l|}{Sub Table} \\\\ \\hline
\\multicolumn{3}{|l|}{Subtext \\manualText{(Deutsch)}{}} & \\multicolumn{3}{l|}{Textlol \\manualText{(:9)}{}}  \\\\ \\hline
\\scriptsize$L_{1}$ 2412 & \\scriptsize$L_{2}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$L_{3}$ \\lineloesung{~~~~~}{4242} & \\scriptsize$L_{4}$ ~~~2356 & \\scriptsize$L_{5}$ ~~~2471 & \\scriptsize$L_{6}$ \\lineloesung{~~~~~}{4242} \\\\
\\hline
\\end{tabular}
\\end{center}`,
    },
    {
      name: 'ISO/OSI Layers',
      previewImageUrl: `${environment.publicPath}iso-osi.jpg`,
      latex: `\\begin{center}
ISO/OSI Layer:\\\\
\\begin{tabular}{|c|}
\\hline
% Text in der Klausur an der Stelle (z.b. in Tabelle) + Lösung an der Stelle
\\lineloesung{L4:~~~~~~~~~~}{Transport} \\\\
\\hline
\\lineloesung{L3:~~~~~~~~~~}{Network} \\\\
\\hline
\\lineloesung{L2:~~~~~~~~~~}{Data Link} \\\\
\\hline
\\lineloesung{L1:~~~~~~~~~~}{Physical} \\\\
\\hline
\\end{tabular}
\\end{center}`,
    },
  ];

  constructor() {}

  public getPreviews(): LatexPreview[] {
    return this.previews;
  }

  public getPreviewByName(name: string): LatexPreview {
    const preview = this.previews.find(preview => preview.name === name);
    if (!preview) {
      throw new Error(`Preview with name ${name} not found`);
    }
    return preview;
  }
}
