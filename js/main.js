/**
 * load navigation
 */
$(function () {
    $("#navigation").append("<header>\n" +
        "    <div id=\"logo\">EXTRUSO</div>\n" +
        "    <nav class=\"site-navigation\">\n" +
        "        <ul class=\"menu-list\">\n" +
        "            <li><a href=\"https://extruso.bu.tu-dresden.de\">Home</a></li>\n" +
        "            <li><a href=\"https://extruso.bu.tu-dresden.de/news\">Aktuelles</a></li>\n" +
        "            <li><a href=\"https://extruso.bu.tu-dresden.de/map\">Karte</a></li>\n" +
        "            <li><a href=\"https://extruso.bu.tu-dresden.de/projektinfo\">Projektinformationen</a></li>\n" +
        "        </ul>\n" +
        "    </nav>\n" +
        "</header>");
});

/**
 * load footer
 */
$(function () {
    $("#footer").append("<footer>\n" +
        "   <div class=\"content white\" style=\"line-height: 4em;text-align: center;\">\n" +
        "       &copy; EXTRUSO Projekt\n" +
        "   </div>\n" +
        "</footer>");
});

/**
 * load funding info
 */
$(function () {
    $("#funding").append("<div class=\"content container\">\n" +
        "    <div class=\"flex-container\">\n" +
        "       <div class=\"flex-item-fun\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-extruso.png\"></div>\n" +
        "       <div class=\"flex-item-fun\"><a href=\"https://tu-dresden.de\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-tud.png\"></a></div>\n" +
        "       <div class=\"flex-item-fun\"><a href=\"http://www.esf.de\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-esf.png\"></a></div>\n" +
        "    </div>\n" +
        "</div>");
});

/**
 * expand/collapse article content
 */
$(function () {
    $(".article_title").click(function () {
        var $title = $(this);
        var $content = $title.next();
        $content.slideToggle(500);
        $title.toggleClass("collapsed");
        $title.toggleClass("expanded");
    });
});

/**
 * ajax loading GIF
 */
$(document)
    .ajaxStart(function () {
        $('#loading_overlay').show();
    })
    .ajaxStop(function () {
        $('#loading_overlay').hide();
    });