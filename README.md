# AssNat

Cette librairie extrait les données du site de l'Assemblée Nationale du Québec et les structure dans une base de données MongoDB de manière à les rendre plus facilement exploitables. C'est la fondation sur laquelle repose l'API [assnatapi][].

## Utilisation

Pour l'instant, cette librairie est en fait un programme de ligne de commande (CLI). Pour extraire les données d'une journée de débats, il faut exécuter la commande suivante (qui suppose l'installation préalable de node.js):

`node run.js <URL du journal de débats>`

Éventuellement, il faudrait un automatisme de plus haut niveau, qui vérifie à intervalles réguliers la présence de nouveaux journaux, et déclenche automatiquement cette librairie pour extraire les données.

Le code est encore très en mode débogage, et pas optimal - particulièrement dans les interactions avec la BD (le *scraping* de la page n'est pas trop mal). Il manque beaucoup de tests automatisés.

Pour éviter de surutiliser le serveur de l'Assemblée lors de tests, les pages html peuvent être lues à partir de fichiers locaux. Les différents députés et quelques journaux de débats sont disponibles sous /test/data, et il s'agit de modifier run.js pour spécifier le fichier à charger (load:) au lieu de l'URL (url:). Le code est présent, en commentaire, dans le fichier.

## Variables d'environnement

Les variables suivantes sont requises pour l'exécution. Évidemment, je ne diffuse pas les paramètres de connexion à la base de données "officielle" (celle de l'assnatapi), mais il est assez simple de se monter une BD de test, les collections Mongo seront créées automatiquement, et les index peuvent être créés via la commande `make mongo-index`.

*    MONGO_HOST : l'hôte de la BD
*    MONGO_PORT : le numéro du port de la BD
*    MONGO_DB : le nom de la base de données
*    MONGO_USER : le nom d'utilisateur pour la connexion à la BD (nécessite évidemment des droits en lecture-écriture)
*    MONGO_PWD : le mot de passe pour la connexion à la BD
*    EMAIL_DOMAIN : le domaine (hôte) pour l'envoi de courriels (ex.: smtp.sendgrid.net)
*    EMAIL_PORT : le numéro de port pour l'envoi de courriels
*    EMAIL_FROM_DOMAIN : le domaine source de l'envoi
*    EMAIL_FROM_EMAIL : le courriel de l'expéditeur
*    EMAIL_TO_EMAIL : le courriel de destination
*    EMAIL_USER : le nom d'utilisateur pour la connexion au serveur de courriels
*    EMAIL_PWD : le mot de passe pour la connexion au serveur de courriels

Les paramètres de courriels servent à envoyer un courriel de statistiques ou d'erreurs lorsqu'un journal de débat est traité.

[assnatapi]: http://puerkitobio.github.com/assnatapi/
