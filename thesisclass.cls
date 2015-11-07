%% LaTeX2e class for diploma theses
%% Based on wissdoc.cls by Roland Bless, 1996-2001
%% bless@telematik.informatik.uni-karlsruhe.de
%%
%% Adapted by: Timo Rohrberg, 2009
%% timo.rohrberg@student.kit.edu
%%
%% Additions by: Thorsten Haberecht, IPD - Chair Prof. Böhm, 2010
%% thorsten.haberecht@kit.edu
%%
%% Fixes by: Max-Gerd Retzlaff, IBDS - Lehrstuhl Computergrafik, KIT, 2012
%% m.retzlaff@gmx.net

\NeedsTeXFormat{LaTeX2e}										% We do need LaTeX2e
\ProvidesClass{thesisclass}
\LoadClass[a4paper,11pt,titlepage]{scrbook}	% Class based on scrbook

% following line removed by M. Retzlaff, 20121114, conflict with Babel and outdated:
%\RequirePackage{ngerman}										% New german orthography


%% -------------------------------
%% |          Packages           |
%% -------------------------------

\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}    % switched from ISO-8859-1 / Latin1 to UTF-8 (M. Retzlaff)

% M. Retzlaff, 20121114, replaced:  (see ftp://ftp.dante.de/pub/tex/info/german/l2tabu/ )
%\usepackage{ae}               % Almost european, virtual T1-Font
% by
\usepackage{lmodern}

\usepackage[pdftex]{graphicx}
\usepackage{vmargin}          % Adjust margins in a simple way
\usepackage{fancyhdr}         % Define simple headings
\usepackage{subfigure}
\usepackage{url}
\usepackage[absolute,overlay]{textpos}
\usepackage{tikz}
\usepackage[english,ngerman]{babel}
\usepackage{algorithm}		  % Code-Listings
\usepackage{algorithmic}	  % Code-Listings
% see http://www.ctan.org/tex-archive/macros/latex/contrib/algorithm2e/algorithm2e.pdf
% for more sophisticated algorithm listings

\usepackage[raiselinks=true,
						bookmarks=true,
						bookmarksopenlevel=1,
						bookmarksopen=true,
						bookmarksnumbered=true,
						hyperindex=true,
						plainpages=false,
						pdfpagelabels=true,
						pdfborder={0 0 0.5},
						colorlinks=false,						
						linkbordercolor={0 0.61 0.50},   
						citebordercolor={0 0.61 0.50}]{hyperref}  %{0.57 0.74 0.57}
						
\usepackage[fixlanguage]{babelbib}	% sets german style for literature entries
\selectbiblanguage{ngerman}			% for \bibliographystyle{babalpha}
%% --- End of Packages ---


%% --------------------------------
%% | Bugfix for babel/germanb.dtx |
%% --------------------------------
%% see: http://www.macrotron.net/babel-hyphens.txt
\declare@shorthand{german}{"~}{\textormath{\leavevmode\hbox{-}\bbl@allowhyphens}{-}}
\declare@shorthand{ngerman}{"~}{\textormath{\leavevmode\hbox{-}\bbl@allowhyphens}{-}}

%% -------------------------------
%% |        Declarations         |
%% -------------------------------
\DeclareGraphicsExtensions{.svg}
%% --- End of Declarations ---



%% -------------------------------
%% |         New commands        |
%% -------------------------------
\newcommand{\changefont}[3]{\fontfamily{#1} \fontseries{#2} \fontshape{#3} \selectfont}
%\renewcommand*{\headfont}{\slshape}
%\newcommand{\captionfont}{}
\newcommand{\chapterheadfont}{}
\newcommand{\blankpage}{
 \clearpage{\pagestyle{empty}\cleardoublepage}
}
%% --- End of New Commands ---



%% -------------------------------
%% |      Globale Settings       |
%% -------------------------------
\setcounter{secnumdepth}{3} % Numbering also for \subsubsections
\setcounter{tocdepth}{3}    % Register \subsubsections in content directory

\setpapersize{A4}
\setmarginsrb{3cm}{1cm}{3cm}{1cm}{6mm}{7mm}{5mm}{15mm}

\parindent 0cm                     % Do not indent beginning of paragraph
\parskip1.5ex plus0.5ex minus0.5ex % Margin between paragraphs
%% --- End of global Settings ---



%% -------------------------------
%% |          Headings           |
%% -------------------------------
\pagestyle{fancy}
\renewcommand{\chaptermark}[1]{\markboth{\thechapter.\ #1}{}}
\fancyhf{}
\fancyhead[LE,RO]{{\headfont\thepage}}						% Left/right header for even/odd pages
\fancyhead[LO]{\headfont\nouppercase{\rightmark}}	% Header for left page (odd)
\fancyhead[RE]{\headfont\nouppercase{\leftmark}}	% Header for right page (even)
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.5pt}
\renewcommand{\footrulewidth}{0pt}
\fancypagestyle{plain}{%
\fancyhf{}													% No Header and Footer fields
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\fancyfoot[C]{\thepage}
}
%% --- End of Headings ---



%% -------------------------------
%% |      Style of captions      |
%% -------------------------------
\renewcommand{\chaptername}{}

\renewcommand{\section}{%
\@startsection{section}%
{1}		% Structure level
{0mm}	% Indention
{2ex plus 1ex minus 1ex}			% Pre-Margin
{0.5ex plus 0.5ex minus 0.5ex}		% Post-Margin
{\chapterheadfont\Large\bfseries}	% Style
}
\renewcommand{\subsection}{%
\@startsection{subsection}%
{2}		% Structure level
{0mm}	% Indention
{1.5ex plus 1ex minus 0.5ex}		% Pre-Margin
{0.3ex plus 0.3ex minus 0.3ex}		% Post-Margin
{\chapterheadfont\large\bfseries}	% Style
}
\renewcommand{\subsubsection}{%
\@startsection{subsubsection}%
{3}		% Structure level
{0mm}	% Indention
{1.5ex plus 1ex minus 0.5ex}			% Pre-Margin
{0.2ex plus 0.2ex minus 0.2ex}			% Post-Margin
{\chapterheadfont\normalsize\bfseries}	% Style
}
\renewcommand{\paragraph}{%
\@startsection{paragraph}%
{4}		% Structure level
{0mm}	% Indention
{1.3ex plus 1ex minus 0.3ex}			% Pre-Margin
{0.2ex plus 0.2ex minus 0.2ex}			% Post-Margin
{\chapterheadfont\normalsize\bfseries}	% Style
}
\renewcommand{\subparagraph}{%
\@startsection{subparagraph}%
{5}		% Structure level
{0mm}	% Indention
{1ex plus 1ex minus 0.2ex}				% Pre-Margin
{0.1ex plus 0.1ex minus 0.1ex}			% Post-Margin
{\chapterheadfont\normalsize\bfseries}	% Style
}
%% --- End of captions style ---



%% ---------------------------------
%% |   Style of chapter captions   |
%% ---------------------------------
\newlength{\chapnolen}
\newlength{\chapparlen}
\newsavebox{\chapno}
\renewcommand{\@makechapterhead}[1]{
  \vspace*{0.2\textheight}
  \vskip 15\p@
  {\parindent \z@ \raggedright \normalfont
    \ifnum \c@secnumdepth >\m@ne
      \if@mainmatter
        \savebox{\chapno}{\chapterheadfont\huge\bfseries \thechapter.}
        \settowidth{\chapnolen}{\usebox{\chapno}}
        \parbox[t]{\chapnolen}{\usebox{\chapno}}\nobreak\leavevmode
      \fi
    \fi
    \interlinepenalty\@MM
    \setlength{\chapparlen}{\textwidth}
    \addtolength{\chapparlen}{-1.0\chapnolen}
    \addtolength{\chapparlen}{-2ex}
    \leavevmode\nobreak
    \parbox[t]{\chapparlen}{\raggedright\chapterheadfont\huge \bfseries #1\par\nobreak}
    \vskip 40\p@
  }}

\renewcommand{\@makeschapterhead}[1]{
  \vspace*{50\p@}
  {\parindent \z@ \raggedright
    \normalfont
    \interlinepenalty\@M
    \chapterheadfont \huge \bfseries  #1\par\nobreak
    \vskip 40\p@
  }
}
%% --- End of chapter captions style ---


%% ---------------------------------
%% |  Style of content directory   |
%% ---------------------------------
\let\oldtableofcontents\tableofcontents
\renewcommand{\tableofcontents}{{\pdfbookmark{\contentsname}{\contentsname}\chapterheadfont\oldtableofcontents}}
\let\@olddottedtocline\@dottedtocline
\renewcommand{\@dottedtocline}[5]{\@olddottedtocline{#1}{#2}{#3}{#4}{\chapterheadfont #5}}
%% --- End of content directory style ---


%% ----------------------------------
%% |  Style of appendix numbering   |
%% ----------------------------------
 \renewcommand\appendix{\par 
   \setcounter{section}{0}% 
   \setcounter{subsection}{0}% 
   \setcounter{figure}{0}%
   \renewcommand\thesection{\Alph{section}}% 
   \renewcommand\thefigure{\Alph{section}.\arabic{figure}} 
   \renewcommand\thetable{\Alph{section}.\arabic{table}}}
%% --- End of appenix numbering style ---



%% ----------------------------------
%% |  Erklärung                     |
%% ----------------------------------
 \def\Erklaerung{
   \cleardoubleemptypage
   \parindent0pt
   \chapter*{Erkl\"arung}
   \bigskip
%   Ich versichere, dass ich die Arbeit ohne fremde Hilfe und ohne Benutzung
%   anderer als der angegebenen Quellen angefertigt habe, und dass die Arbeit in
%   gleicher oder \"ahnlicher Form noch keiner anderen Pr\"ufungsbeh\"orde
%   vorgelegen hat und von dieser als Teil einer Pr\"ufungsleistung angenommen
%   wurde. Alle Ausf\"uhrungen, die w\"ortlich oder sinngem\"a\ss \"ubernommen
%   wurden, sind als solche gekennzeichnet. \\[4cm]
% new on 2012-11-19, see http://www.kit.edu/studieren/amtlicheBekanntmachungen_2126.php
   Ich versichere, dass ich die Arbeit selbstst\"andig verfasst habe und keine
   anderen als die angegebenen Quellen und Hilfsmittel benutzt habe, die
   w\"ortlich oder inhaltlich \"ubernommenen Stellen als solche
   kenntlich gemacht und die Satzung des KIT zur Sicherung guter wissenschaftlicher
   Praxis in der jeweils gültigen Fassung beachtet habe.
   Die Arbeit wurde in gleicher oder \"ahnlicher Form noch keiner
   anderen Pr\"ufungsbeh\"orde vorgelegt und von dieser als Teil
   einer Pr\"ufungsleistung angenommen. \\[4cm]

   Karlsruhe, den \today\hfill

   \hfill{\vbox{\hrule{\hbox{\small(\myname)}}}}
   \thispagestyle{empty}
 }

%% **** END OF CLASS ****
