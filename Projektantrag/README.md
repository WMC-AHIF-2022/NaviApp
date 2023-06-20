# Navi-App

## 1. Ausgangslage 

### Ist-Situation:
Die Grundidee ist eine Navi-App zu entwickeln, wobei der Hauptfokus auf Routenplanung und Erlernung der technischen Hintergründe liegt. 

Derzeit befinden sich diverse ausgereifte Navis auf dem Markt, jedoch kann man hierbei die Technologie hinter der Navigation und Routenplanung nicht erkennen.  
Aus diesem Grund möchten wir auf einer interaktiven Karte unsere eigene Navigation programmieren. 

## 2. Zielsetzung
![Zielsetzung](imgs/Mindmap_Zielsetzung.png)

### Interaktive Karte:
Als Basis unseres Navis verwenden wir die Open-Source Karte "OpenStreetMap".
Diese bietet eine Editer-API, womit die Daten der Straßen von der Datenbank gelesen und gespeichert werden können. Da somit ein einfacher Zugriff 
auf die jeweiligen Daten gewährleistet und eine schöne Darstellung der Karte geboten wird, ist es für uns einfacher unsere Routenplanung auf OpenStreetMap
zu implementieren als auf diversen Kontrahenten.

### Routenplanung:
Um eine Route zu berechnen, wird der benötigte Straßenabschnitt über die API von OpenStreetMap abgefragt. 
Dadurch erhalten wir eine Liste von "Nodes" (Knoten, durch den die Straße führt) und den dazugehörigen Koordinaten (welche wiederum von der API erhalten werden).
Durch mehrere Recherchen sind wir auf den A*-Algorithmus gestoßen.

Die Idee des Algorithmus ist, dass sich jeder Node in einem der folgenden drei Zuständen befindet:
- unbekannter Node
- bekannter Node (Liste)
- fertig untersuchter Node 

Jeder Node besitzt die Summe aus der Distanz zum Startnode und der Entfernung zum Zielnode. Diese Summe wird in einem Wert gespeichert. Der Node, der den niedrigsten
Wert besitzt gelangt an den Anfang der Liste von den bereits bekannten Nodes. 
Die Strecke zu dem jeweiligen Node wird an den Client gesendet und der Node wird aus der Liste entnommen. Der nächst kleinste Wert wird nun an die erste Stelle gerückt. 


## 3. Chancen und Risiken 
![SWOT Modell](imgs/SWOT_Modell.png)

## 4. Planung 
### Finanzielle Rahmenbedingungen: 
Die Erarbeitung des Projektes erfolgt mit kostenlosen Tools (kostenlose GUI-Mockups, Wireframes etc.)

## 5. Meilensteine 

### Wintersemester:
1. Allgemeine Planung des Projekts
2. Projektantrag schreiben 
3. Planung des Designs mithilfe von GUI-Mockups

### Sommersemester:
1. Einfügen der interaktiven Karte
2. Programmierung des Servers um Daten der Straße zu erhalten
3. Programmierung der Routenplanung
4. Vorschau der Route (vor Drücken des Start-Buttons)
5. Adresseingabe
6. Interaktive Navigation

Hierbei wird unüblicher Weise zuerst das Backend implementiert, da wir dieses zusammen erarbeiten und die Routenplanung benötigt wird, 
um die Vorschau anzuzeigen und eine funktionstüchtige Adresseingabe zu ermöglichen.
