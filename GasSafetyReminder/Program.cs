using System;
using System.Threading;
using System.Threading.Tasks;

const string Message =
    "Birgalikda is gazidan zaharlanishning oldini olaylik! " +
    "Gaz jihozlarini tekshiring, xonalarni muntazam shamollating.";

using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
using var cts = new CancellationTokenSource();

Console.CancelKeyPress += (s, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

try
{
    // Birinchi xabar darhol, keyingilari har soatda yuboriladi.
    do
    {
        await TrySendAsync(Message, cts.Token);
    }
    while (await timer.WaitForNextTickAsync(cts.Token));
}
catch (OperationCanceledException)
{
    Console.WriteLine("Dastur to'xtatildi.");
}

static async Task TrySendAsync(string message, CancellationToken token)
{
    try
    {
        await SendMessageAsync(message, token);
    }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        Console.Error.WriteLine($"Xabar yuborilmadi: {ex.Message}");
    }
}

static async Task SendMessageAsync(string message, CancellationToken token)
{
    Console.WriteLine($"[{DateTime.Now:yyyy-MM-dd HH:mm}] {message}");

    // Haqiqiy yuborish (Telegram, SMS, e-mail va h.k.) shu yerga qo'shiladi.
    await Task.Delay(100, token);

    Console.WriteLine("Xabar yuborildi.");
}
